/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Measures toast size off-screen so layout reads do not flash visible cards. */
export const measurePocToastCardSize = (
  element: HTMLElement,
  layoutWidth?: number
): { width: number; height: number } => {
  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.cssText = [
    'position: fixed',
    'top: 0',
    'left: 0',
    'visibility: hidden',
    'pointer-events: none',
    'height: auto',
    'max-height: none',
    'overflow: visible',
    layoutWidth !== undefined ? `width: ${layoutWidth}px` : 'width: max-content',
  ].join(';');

  document.body.appendChild(clone);
  const { width, height } = clone.getBoundingClientRect();
  document.body.removeChild(clone);

  return { width: Math.ceil(width), height: Math.ceil(height) };
};
