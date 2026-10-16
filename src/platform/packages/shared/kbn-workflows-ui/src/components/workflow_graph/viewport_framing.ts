/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Node } from '@xyflow/react';
import type { LayoutDirection } from '@kbn/workflows';
import { PENDING_NODE_HEIGHT, PENDING_NODE_WIDTH } from './pending_insert';

// Predefined zoom for the initial graph view; user can zoom in/out from
// the bar afterwards. Picked to match the readability shown in the design.
export const INITIAL_ZOOM = 1;
export const TOP_PADDING = 80;

export interface GraphBounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
  readonly centerX: number;
  readonly centerY: number;
}

/** Bounds used when the graph has no top-level nodes yet. */
export const EMPTY_GRAPH_BOUNDS: GraphBounds = {
  minX: -1000,
  minY: -1000,
  maxX: 1000,
  maxY: 1000,
  centerX: 0,
  centerY: 0,
};

/**
 * Returns the `setCenter` target (x, y) for the initial / reset view.
 *
 * The framing is axis-aware: for `TB` (vertical) the trigger row is the topmost
 * rank so we anchor it near the top edge — `minY` is placed `TOP_PADDING` pixels
 * from the top, and the graph is centred horizontally (`centerX`). For `LR`
 * (horizontal) the trigger column is the leftmost rank, so we mirror the framing:
 * `minX` is anchored `TOP_PADDING` pixels from the left edge, and the graph is
 * centred vertically (`centerY`). Both axes use the same `TOP_PADDING` constant.
 *
 * Callers should pass bounds for the *leading rank* (triggers), not the full
 * graph AABB — otherwise wide branches pull the triggers off-center.
 */
export const getResetViewTarget = (
  direction: LayoutDirection,
  bounds: Pick<GraphBounds, 'minX' | 'minY' | 'centerX' | 'centerY'>,
  wrapperWidth: number,
  wrapperHeight: number,
  topPadding: number = TOP_PADDING
): { x: number; y: number } =>
  direction === 'LR'
    ? { x: bounds.minX + wrapperWidth / 2 - topPadding, y: bounds.centerY }
    : { x: bounds.centerX, y: bounds.minY + wrapperHeight / 2 - topPadding };

export const boundsFromNodes = (nodes: readonly Node[]): GraphBounds | undefined => {
  // Parent-relative child positions are not canvas-absolute — only top-level
  // nodes (and compound parents) contribute to the AABB.
  const topLevel = nodes.filter((n) => !n.parentId);
  if (topLevel.length === 0) return undefined;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of topLevel) {
    const w = typeof n.width === 'number' ? n.width : PENDING_NODE_WIDTH;
    const h = typeof n.height === 'number' ? n.height : PENDING_NODE_HEIGHT;
    if (n.position.x < minX) minX = n.position.x;
    if (n.position.y < minY) minY = n.position.y;
    if (n.position.x + w > maxX) maxX = n.position.x + w;
    if (n.position.y + h > maxY) maxY = n.position.y + h;
  }
  return { minX, minY, maxX, maxY, centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2 };
};

/**
 * Home framing uses the trigger row/column so wide downstream branches do not
 * shift triggers away from the center-top (TB) / center-left (LR) landing.
 * Falls back to the full graph when there are no triggers yet.
 */
export const getHomeFrameBounds = (nodes: readonly Node[], fallback: GraphBounds): GraphBounds => {
  // Frame the leading rank: settings (when present) + triggers so the home
  // view keeps both rows in view under TOP_PADDING.
  // Prefer the settings group (absolute) over child cards (parent-relative).
  const leading = nodes.filter((n) => n.type === 'trigger' || n.type === 'settingsGroup');
  return boundsFromNodes(leading.length > 0 ? leading : nodes) ?? fallback;
};
