/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Create cursor position display
const cursorDisplay = document.createElement('div');
cursorDisplay.style.position = 'fixed';
cursorDisplay.style.bottom = '10px';
cursorDisplay.style.right = '10px';
cursorDisplay.style.padding = '5px 10px';
cursorDisplay.style.background = 'rgba(0, 0, 0, 0.7)';
cursorDisplay.style.color = 'white';
cursorDisplay.style.fontFamily = 'monospace';
cursorDisplay.style.zIndex = '9999';
cursorDisplay.style.borderRadius = '3px';
cursorDisplay.style.pointerEvents = 'none';
document.body.appendChild(cursorDisplay);

// Add circular indicator around cursor
const cursorCircle = document.createElement('div');
cursorCircle.style.position = 'fixed';
cursorCircle.style.width = '20px';
cursorCircle.style.height = '20px';
cursorCircle.style.borderRadius = '50%';
cursorCircle.style.border = '2px solid red';
cursorCircle.style.transform = 'translate(-50%, -50%)';
cursorCircle.style.pointerEvents = 'none';
cursorCircle.style.zIndex = '9998';
document.body.appendChild(cursorCircle);

// Add inner smaller circular indicator around cursor
const innerCursorCircle = document.createElement('div');
innerCursorCircle.style.position = 'fixed';
innerCursorCircle.style.width = '2px';
innerCursorCircle.style.height = '2px';
innerCursorCircle.style.borderRadius = '50%';
innerCursorCircle.style.border = '2px solid red';
innerCursorCircle.style.transform = 'translate(-50%, -50%)';
innerCursorCircle.style.pointerEvents = 'none';
innerCursorCircle.style.zIndex = '9998';
document.body.appendChild(innerCursorCircle);

// Update position on mouse move
document.addEventListener('mousemove', (e) => {
  cursorDisplay.textContent = `X: ${e.clientX}, Y: ${e.clientY}`;
  cursorCircle.style.left = `${e.clientX}px`;
  cursorCircle.style.top = `${e.clientY}px`;
  innerCursorCircle.style.left = `${e.clientX}px`;
  innerCursorCircle.style.top = `${e.clientY}px`;
});
