import * as THREE from 'three';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let camera, scene, renderer, controls, stats;

let mesh;
const amount = 5;
const count = Math.pow(amount, 3);
const positions = [];
const clickedColors = Array(count).fill(null);
let currentColor = 'blue';
let currentLevel = 4;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(1, 1);

const color = new THREE.Color();
const gray = new THREE.Color(0x333333);
const blue = new THREE.Color(0x3399ff);
const green = new THREE.Color(0x33cc33);
const white = new THREE.Color().setHex(0xffffff);

init();

function init() {
  camera = new THREE.PerspectiveCamera(100, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(amount, amount * 0.5, amount * 1.8);
  camera.lookAt(0, 0, 0);

  scene = new THREE.Scene();

  const light = new THREE.HemisphereLight(0xffffff, 0x888888, 3);
  light.position.set(0, 1, 0);
  scene.add(light);

  const geometry = new THREE.IcosahedronGeometry(0.5, 3);
  const material = new THREE.MeshPhongMaterial({ color: 0xffffff });

  mesh = new THREE.InstancedMesh(geometry, material, count);
  const matrix = new THREE.Matrix4();
  let i = 0;
  const offset = (amount - 1) / 2;

  for (let x = 0; x < amount; x++) {
    for (let y = 0; y < amount; y++) {
      for (let z = 0; z < amount; z++) {
        matrix.setPosition((offset - x) * 2, (offset - y) * 2, (offset - z) * 2);
        mesh.setMatrixAt(i, matrix);

        positions.push({ x, y, z });
        mesh.setColorAt(i, y === 4 ? white : gray);

        i++;
      }
    }
  }

  scene.add(mesh);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enableZoom = false;
  controls.enablePan = false;

  window.addEventListener('resize', onWindowResize);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('click', onClick);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseMove(event) {
  event.preventDefault();

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onClick() {
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(mesh);

  if (intersects.length > 0) {
    const instanceId = intersects[0].instanceId;
    const { x, y, z } = positions[instanceId];
    const index = getIndex(x, y, z);

    if (y > currentLevel || clickedColors[index]) return;

    const chosenColor = currentColor === 'blue' ? blue : green;
    mesh.setColorAt(instanceId, chosenColor);
    mesh.instanceColor.needsUpdate = true;

    clickedColors[index] = currentColor;
    checkWin(x, y, z, currentColor);

    currentColor = currentColor === 'blue' ? 'green' : 'blue';

    if (isLevelFull(currentLevel)) {
      currentLevel++;
      updateLockedState();
    }
  }
}

function animate() {
  controls.update();

  raycaster.setFromCamera(mouse, camera);

  for (let i = 0; i < count; i++) {
    if (!clickedColors[i]) {
      const { y } = positions[i];
      if (y < currentLevel) {
        mesh.setColorAt(i, gray); // блокируем уровни выше текущего
      } else if (y === currentLevel) {
        mesh.setColorAt(i, white); // активный уровень
      } else {
        mesh.setColorAt(i, gray); // уровни выше — серые
      }
    }
  }

  const intersection = raycaster.intersectObject(mesh);

  if (intersection.length > 0) {
    const instanceId = intersection[0].instanceId;

    const { x, y, z } = positions[instanceId];
    const index = getIndex(x, y, z);

    if (!clickedColors[index] && y <= currentLevel) {
      mesh.setColorAt(instanceId, new THREE.Color(0xffffaa));
    }
  }

  mesh.instanceColor.needsUpdate = true;
  renderer.render(scene, camera);
}

function updateLockedState() {
  for (let i = 0; i < count; i++) {
    if (!clickedColors[i]) {
      const { y } = positions[i];
      mesh.setColorAt(i, y <= currentLevel ? white : gray);
    }
  }
  mesh.instanceColor.needsUpdate = true;
}

function getIndex(x, y, z) {
  return x * amount * amount + y * amount + z;
}

function isLevelFull(level) {
  return positions.map((pos, i) => (pos.y === level ? clickedColors[i] : true)).every(Boolean);
}

function checkWin(x0, y0, z0, color) {
  const directions = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
    [1, 1, 0],
    [1, 0, 1],
    [0, 1, 1],
    [1, -1, 0],
    [1, 0, -1],
    [0, 1, -1],
    [1, 1, 1],
    [1, -1, 1],
    [-1, 1, 1],
    [1, 1, -1],
  ];

  for (const [dx, dy, dz] of directions) {
    let count = 1;

    for (const dir of [-1, 1]) {
      let x = x0 + dx * dir;
      let y = y0 + dy * dir;
      let z = z0 + dz * dir;

      while (x >= 0 && x < amount && y >= 0 && y < amount && z >= 0 && z < amount) {
        const index = getIndex(x, y, z);
        if (clickedColors[index] === color) {
          count++;
          x += dx * dir;
          y += dy * dir;
          z += dz * dir;
        } else {
          break;
        }
      }
    }

    if (count >= 4) {
      setTimeout(() => alert(`${color.toUpperCase()} wins!`), 10);
      break;
    }
  }
}
