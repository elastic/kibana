/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FULL_HANDLE_DIM, MIN_HANDLE_DIM, RESIZE_HANDLE_SIZE } from '../lib/constants';
import type { ResizeHandle } from '../lib/constants';
import { setImportant } from '../lib/dom/set_important';
import type { ElementSession } from './element_registry';
import type { ResizeState } from './interaction_state';

/**
 * Calculate position and dimensions given a handle being dragged.
 * Edge handles (`n`, `e`, `s`, `w`) constrain to a single axis.
 * Corner handles (`nw`, `ne`, `sw`, `se`) resize both axes.
 *
 * @param handle - The resize handle being dragged.
 * @param mouseDx - Horizontal pointer delta from start.
 * @param mouseDy - Vertical pointer delta from start.
 * @param baseWidth - Original element width.
 * @param baseHeight - Original element height.
 * @param baseDx - Position offset at resize start (x).
 * @param baseDy - Position offset at resize start (y).
 * @param minSize - Minimum allowed dimension.
 * @returns Computed position and size deltas.
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

  const hasEastComponent = handle === 'e' || handle === 'ne' || handle === 'se';
  const hasWestComponent = handle === 'w' || handle === 'nw' || handle === 'sw';
  const hasSouthComponent = handle === 's' || handle === 'se' || handle === 'sw';
  const hasNorthComponent = handle === 'n' || handle === 'nw' || handle === 'ne';

  // Horizontal component. Round to prevent sub-pixel jitter during continuous resize
  if (hasEastComponent) {
    width = Math.round(Math.max(minSize, baseWidth + mouseDx));
  } else if (hasWestComponent) {
    width = Math.round(Math.max(minSize, baseWidth - mouseDx));
    // Clamp dx so the element doesn't drift past its anchor when hitting minSize
    dx = baseDx + (baseWidth - width);
  }

  // Vertical component
  if (hasSouthComponent) {
    height = Math.round(Math.max(minSize, baseHeight + mouseDy));
  } else if (hasNorthComponent) {
    height = Math.round(Math.max(minSize, baseHeight - mouseDy));
    dy = baseDy + (baseHeight - height);
  }

  return { dx, dy, width, height };
};

/**
 * Start a resize operation from a handle.
 *
 * @param session - The element session being resized.
 * @param handle - The resize handle being dragged.
 * @param clientX - Pointer X at resize start.
 * @param clientY - Pointer Y at resize start.
 * @returns The initial resize state.
 */
export const startResize = (
  session: ElementSession,
  handle: ResizeHandle,
  clientX: number,
  clientY: number
): ResizeState => {
  session.el.style.pointerEvents = 'none';
  session.el.style.transformOrigin = '0 0';
  session.el.style.willChange = 'transform';

  return {
    type: 'resize',
    session,
    handle,
    startX: clientX,
    startY: clientY,
    baseWidth: session.originalRect.width + session.dw,
    baseHeight: session.originalRect.height + session.dh,
    baseDx: session.dx,
    baseDy: session.dy,
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
 *
 * @param rect - The element's bounding dimensions.
 * @returns The handle display mode.
 */
export const getHandleMode = (rect: {
  width: number;
  height: number;
}): 'all' | 'corners' | 'none' => {
  const minDim = Math.min(rect.width, rect.height);
  if (minDim < MIN_HANDLE_DIM) return 'none';
  if (minDim < FULL_HANDLE_DIM) return 'corners';
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
 *
 * @param pointerX - Pointer X coordinate.
 * @param pointerY - Pointer Y coordinate.
 * @param rect - The element's bounding rect.
 * @returns The handle under the pointer, or `null`.
 */
export const findNearHandle = (
  pointerX: number,
  pointerY: number,
  rect: DOMRect
): ResizeHandle | null => {
  const mode = getHandleMode(rect);
  if (mode === 'none') return null;

  const half = RESIZE_HANDLE_SIZE / 2;
  const minDim = Math.min(rect.width, rect.height);
  const maxRadius = minDim * 0.35;

  for (const [handle, anchor] of HANDLE_ANCHORS) {
    if (mode === 'corners' && handle.length === 1) continue;

    const [cx, cy] = anchor(rect);
    const dx = pointerX - cx;
    const dy = pointerY - cy;
    const desiredRadius = handle.length === 1 ? half + 10 : half + 6;
    const radius = Math.min(desiredRadius, maxRadius);
    if (dx * dx + dy * dy <= radius * radius) {
      return handle;
    }
  }
  return null;
};

/**
 * Builds a CSS transform string combining translate and optional scale.
 * Uses transform-origin: 0 0 so scale grows from top-left.
 *
 * @param dx - Horizontal translation.
 * @param dy - Vertical translation.
 * @param scaleX - Horizontal scale factor.
 * @param scaleY - Vertical scale factor.
 * @returns The CSS transform string.
 */
export const buildTransform = (dx: number, dy: number, scaleX: number, scaleY: number): string => {
  // Round translate values to whole pixels to keep the element on the pixel
  // grid. Subpixel translations cause the browser to anti-alias text,
  // resulting in blurry rendering.
  const rdx = Math.round(dx);
  const rdy = Math.round(dy);
  const isUnscaled = scaleX === 1 && scaleY === 1;
  if (isUnscaled) {
    return `translate(${rdx}px, ${rdy}px)`;
  }
  return `translate(${rdx}px, ${rdy}px) scale(${scaleX}, ${scaleY})`;
};

/**
 * Applies a resize frame: computes deltas, updates the transform, and
 * writes the new offsets back to the session.
 *
 * @param state - The current resize state.
 * @param clientX - Current pointer X.
 * @param clientY - Current pointer Y.
 */
export const applyResizeMove = (state: ResizeState, clientX: number, clientY: number): void => {
  const { session, handle, startX, startY, baseWidth, baseHeight, baseDx, baseDy } = state;
  const { originalRect, el } = session;
  const mouseDx = clientX - startX;
  const mouseDy = clientY - startY;
  const { dx, dy, width, height } = calcResizeDeltas(
    handle,
    mouseDx,
    mouseDy,
    baseWidth,
    baseHeight,
    baseDx,
    baseDy
  );

  const hasZeroDimension = originalRect.width === 0 || originalRect.height === 0;
  if (hasZeroDimension) return;
  const scaleX = width / originalRect.width;
  const scaleY = height / originalRect.height;
  const newTransform = buildTransform(dx, dy, scaleX, scaleY);
  setImportant(el, 'transform', newTransform);

  session.dx = dx;
  session.dy = dy;
  session.dw = width - originalRect.width;
  session.dh = height - originalRect.height;
};

/**
 * Compute the absolute position of each resize handle relative to the outline box.
 *
 * @param width - The outline box width.
 * @param height - The outline box height.
 * @param handleSize - The handle element size in pixels.
 * @returns Positions keyed by handle name.
 */
export const getHandlePositions = (
  width: number,
  height: number,
  handleSize: number
): Record<ResizeHandle, { top: number; left: number }> => {
  const half = handleSize / 2;
  return {
    nw: { top: -half, left: -half },
    n: { top: -half, left: width / 2 - half },
    ne: { top: -half, left: width - half },
    e: { top: height / 2 - half, left: width - half },
    se: { top: height - half, left: width - half },
    s: { top: height - half, left: width / 2 - half },
    sw: { top: height - half, left: -half },
    w: { top: height / 2 - half, left: -half },
  };
};
