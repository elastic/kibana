/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEVTOOL_CLONE_ATTR } from '../../lib/constants';
import { cloneElement } from '../../lib/dom/clone_element';
import type { ElementOffset } from '../../lib/dom/get_element_under';

export interface DragState {
  el: HTMLElement;
  clone: HTMLElement;
  startX: number;
  startY: number;
  baseOffsetX: number;
  baseOffsetY: number;
  /** The original element's rect before any dragging — used for snap calculations. */
  originalRect: DOMRect;
}

/**
 * Begin dragging an existing clone (re-grab).
 * Disables pointer events on the clone so it doesn't interfere with hit-testing during drag.
 */
export const startDragFromClone = (
  entry: ElementOffset,
  clientX: number,
  clientY: number
): DragState => {
  const clone = entry.clone!;
  clone.style.pointerEvents = 'none';
  clone.style.willChange = 'transform';

  return {
    el: entry.el,
    clone,
    startX: clientX,
    startY: clientY,
    baseOffsetX: entry.dx,
    baseOffsetY: entry.dy,
    originalRect: entry.originalRect,
  };
};

/**
 * Begin dragging a new element for the first time.
 * Creates a fixed-position clone, hides the original, and tracks it in movedElements.
 */
export const startDragFromElement = (
  target: HTMLElement,
  movedElements: ElementOffset[],
  cloneZIndex: number,
  clientX: number,
  clientY: number
): DragState => {
  const existing = movedElements.find((e) => e.el === target);

  if (!existing) {
    movedElements.push({
      el: target,
      clone: null,
      dx: 0,
      dy: 0,
      dw: 0,
      dh: 0,
      originalTransform: target.style.transform || '',
      originalRect: target.getBoundingClientRect(),
    });
  } else if (existing.clone) {
    existing.clone.remove();
    existing.clone = null;
  }

  // Create a visual clone on document.body — always on top, no stacking context issues
  const { clone, rect } = cloneElement(target, cloneZIndex);
  // Set transform-origin for consistent scale behavior during resize
  clone.style.transformOrigin = '0 0';
  document.body.appendChild(clone);

  // Hide the original (preserve layout space) and block pointer events
  // so it doesn't trigger hover effects or the move overlay outline.
  target.style.visibility = 'hidden';
  target.style.pointerEvents = 'none';

  // Store the original element rect for consistent snap calculations across re-grabs
  const entry = movedElements.find((e) => e.el === target);
  if (entry) {
    entry.originalRect = rect;
  }

  return {
    el: target,
    clone,
    startX: clientX,
    startY: clientY,
    baseOffsetX: entry?.dx ?? 0,
    baseOffsetY: entry?.dy ?? 0,
    originalRect: rect,
  };
};

/**
 * Check if the target is an existing clone and find its tracked entry.
 */
export const findExistingClone = (
  target: HTMLElement,
  movedElements: ElementOffset[]
): ElementOffset | null => {
  if (!target.hasAttribute(DEVTOOL_CLONE_ATTR)) return null;
  return movedElements.find((e) => e.clone === target) ?? null;
};
