/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RESIZE_HANDLE_SIZE } from '../../lib/constants';
import type { ResizeHandle } from '../../lib/constants';
import type { ElementOffset } from '../../lib/dom/get_element_under';

export interface ResizeState {
  el: HTMLElement;
  clone: HTMLElement;
  handle: ResizeHandle;
  startX: number;
  startY: number;
  /** Clone width at resize start (includes any prior dw). */
  baseWidth: number;
  /** Clone height at resize start (includes any prior dh). */
  baseHeight: number;
  /** Position offset at resize start (includes any prior dx). */
  baseDx: number;
  /** Position offset at resize start (includes any prior dy). */
  baseDy: number;
  /** The original element's rect — used for snap calculations. */
  originalRect: DOMRect;
}

/**
 * Calculate position and dimensions given a handle being dragged.
 * Edge handles (`n`, `e`, `s`, `w`) constrain to a single axis.
 * Corner handles (`nw`, `ne`, `sw`, `se`) resize both axes.
 */
export const calcResizeDeltas = (
  handle: ResizeHandle,
  mouseDx: number,
  mouseDy: number,
  baseWidth: number,
  baseHeight: number,
  baseDx: number,
  baseDy: number,
  minSize: number = 20
): { dx: number; dy: number; width: number; height: number } => {
  let width = baseWidth;
  let height = baseHeight;
  let dx = baseDx;
  let dy = baseDy;

  // Horizontal component — round to prevent sub-pixel jitter during continuous resize
  if (handle === 'e' || handle === 'ne' || handle === 'se') {
    width = Math.round(Math.max(minSize, baseWidth + mouseDx));
  } else if (handle === 'w' || handle === 'nw' || handle === 'sw') {
    width = Math.round(Math.max(minSize, baseWidth - mouseDx));
    // Clamp dx so the element doesn't drift past its anchor when hitting minSize
    dx = baseDx + (baseWidth - width);
  }

  // Vertical component
  if (handle === 's' || handle === 'se' || handle === 'sw') {
    height = Math.round(Math.max(minSize, baseHeight + mouseDy));
  } else if (handle === 'n' || handle === 'nw' || handle === 'ne') {
    height = Math.round(Math.max(minSize, baseHeight - mouseDy));
    dy = baseDy + (baseHeight - height);
  }

  return { dx, dy, width, height };
};

/**
 * Start a resize operation from a handle.
 */
export const startResize = (
  entry: ElementOffset,
  handle: ResizeHandle,
  clientX: number,
  clientY: number
): ResizeState => {
  const clone = entry.clone!;
  clone.style.pointerEvents = 'none';
  // Ensure transform-origin is top-left so scale grows predictably
  clone.style.transformOrigin = '0 0';
  clone.style.willChange = 'transform';

  return {
    el: entry.el,
    clone,
    handle,
    startX: clientX,
    startY: clientY,
    baseWidth: entry.originalRect.width + entry.dw,
    baseHeight: entry.originalRect.height + entry.dh,
    baseDx: entry.dx,
    baseDy: entry.dy,
    originalRect: entry.originalRect,
  };
};

/** Handles listed with their anchor position relative to the element rect. */
const HANDLE_ANCHORS: ReadonlyArray<[ResizeHandle, (r: DOMRect) => [number, number]]> = [
  ['nw', (r) => [r.left, r.top]],
  ['n', (r) => [r.left + r.width / 2, r.top]],
  ['ne', (r) => [r.right, r.top]],
  ['e', (r) => [r.right, r.top + r.height / 2]],
  ['se', (r) => [r.right, r.bottom]],
  ['s', (r) => [r.left + r.width / 2, r.bottom]],
  ['sw', (r) => [r.left, r.bottom]],
  ['w', (r) => [r.left, r.top + r.height / 2]],
];

/**
 * Determine which handles to show based on the element's smallest dimension.
 * Progressively simplifies as elements get smaller:
 * - >= 64px: all 8 handles
 * - 24–64px: corners only (edges too crowded)
 * - < 24px: none (drag only, resize would dominate the target)
 */
export const getHandleMode = (rect: {
  width: number;
  height: number;
}): 'all' | 'corners' | 'none' => {
  const minDim = Math.min(rect.width, rect.height);
  if (minDim < 24) return 'none';
  if (minDim < 64) return 'corners';
  return 'all';
};

/**
 * Check if a pointer position is within the circular hit zone of any resize
 * handle. Edge handles (single-char like 'n') get a slightly larger radius
 * than corner handles since they're harder to target.
 *
 * Hit zones adapt to element size: radii are clamped so they don't consume
 * tiny elements, and handles are progressively removed as elements shrink.
 *
 * Returns the handle name if hit, or `null`.
 */
export const findNearHandle = (px: number, py: number, rect: DOMRect): ResizeHandle | null => {
  const mode = getHandleMode(rect);
  if (mode === 'none') return null;

  const half = RESIZE_HANDLE_SIZE / 2;
  const minDim = Math.min(rect.width, rect.height);
  const maxRadius = minDim * 0.22;

  for (const [handle, anchor] of HANDLE_ANCHORS) {
    if (mode === 'corners' && handle.length === 1) continue;

    const [cx, cy] = anchor(rect);
    const dx = px - cx;
    const dy = py - cy;
    const desiredRadius = handle.length === 1 ? half + 10 : half + 6;
    const radius = Math.min(desiredRadius, maxRadius);
    if (dx * dx + dy * dy <= radius * radius) {
      return handle;
    }
  }
  return null;
};

/**
 * Build a CSS transform string combining translate and optional scale.
 * Uses transform-origin: 0 0 so scale grows from top-left.
 */
export const buildTransform = (dx: number, dy: number, scaleX: number, scaleY: number): string => {
  if (scaleX === 1 && scaleY === 1) {
    return `translate(${dx}px, ${dy}px)`;
  }
  return `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`;
};
