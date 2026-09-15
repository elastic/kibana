/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CSSProperties } from 'react';
import type { LayoutDirection } from '@kbn/workflows';

/** Rest-state / expanded / hit sizes — kept here so geometry tests share one source. */
export const PORT_DOT_SIZE = 8;
export const PORT_EXPANDED_SIZE = 20;
/** Invisible hit target — must stay ≥22 so the 8px dot is never the click target. */
export const PORT_HIT_SIZE = 22;

/**
 * Outset that places the hit-target center ON the source-edge border line
 * (half the hit box outside the card). Expanded dots grow around the same center.
 */
export const PORT_STRADDLE_OUTSET = PORT_HIT_SIZE / 2;

/** Flow-port band for N ≥ 2 (fraction of the source-edge length). */
export const FLOW_BAND_START = 0.32;
export const FLOW_BAND_END = 0.68;
const FLOW_BAND_SPAN = FLOW_BAND_END - FLOW_BAND_START; // 0.36

/** Minimum center-to-center gap between adjacent flow ports (px). */
export const FLOW_PORT_MIN_GAP = 28;
/** Minimum gap between the last flow port and the error port (px). */
export const FLOW_TO_ERROR_MIN_GAP = 20;

/**
 * Error-port center inset from the RIGHT corner on the BOTTOM edge.
 * Orientation-invariant: only flow ports rotate with layout; error stays here.
 */
export const ERROR_PORT_INSET = 24;

/** @deprecated Use ERROR_PORT_INSET — center+offset error placement is gone. */
export const ERROR_PORT_OFFSET = ERROR_PORT_INSET;

/**
 * Cross-axis fraction (0–1) for flow port `i` of `count` ports in declaration
 * order. N=1 → 0.5; N≥2 → evenly across the 32%–68% band.
 */
export function flowPortFraction(index: number, count: number): number {
  if (count <= 0) return 0.5;
  if (count === 1) return 0.5;
  const clamped = Math.max(0, Math.min(index, count - 1));
  return FLOW_BAND_START + FLOW_BAND_SPAN * (clamped / (count - 1));
}

/** CSS percentage string for a flow port (e.g. `'32%'`). */
export function flowPortAlong(index: number, count: number): string {
  return `${flowPortFraction(index, count) * 100}%`;
}

/** Convenience: if-node true / false along the source edge. */
export const IF_PORT_TRUE = flowPortAlong(0, 2); // 32%
export const IF_PORT_FALSE = flowPortAlong(1, 2); // 68%
/** Single flow port (triggers, regular steps). */
export const STEP_PORT = flowPortAlong(0, 1); // 50%

/**
 * CSS position for the error-port center along the bottom edge
 * (`left: calc(100% - inset)`). Prefer `errorPortEdgeStyle` for absolute nodes.
 */
export const ERROR_PORT_ALONG = `calc(100% - ${ERROR_PORT_INSET}px)`;

/** @deprecated Prefer ERROR_PORT_ALONG / errorPortEdgeStyle. */
export const STEP_ERROR_PORT = ERROR_PORT_ALONG;
/** @deprecated Prefer ERROR_PORT_ALONG — if and step share the same right-inset. */
export const IF_PORT_ERROR = ERROR_PORT_ALONG;

/**
 * Minimum node WIDTH so flow ports on the bottom edge (TB) keep ≥28px gaps and
 * the last flow port stays ≥20px from the error inset. Also used as the height
 * floor for LR flow-port spacing on the right edge (error lives on a different
 * edge there, so only the flow-flow constraint applies when `hasErrorPort` is
 * false for the LR height check — callers pass hasErrorPort for width only).
 */
export function minCrossSizeForPorts(flowCount: number, hasErrorPort: boolean): number {
  let min = 0;
  if (flowCount >= 2) {
    min = Math.max(min, (FLOW_PORT_MIN_GAP * (flowCount - 1)) / FLOW_BAND_SPAN);
  }
  if (hasErrorPort) {
    // Same-edge clearance along the bottom (TB). Error is always bottom-right.
    const lastFlow = flowPortFraction(Math.max(flowCount - 1, 0), Math.max(flowCount, 1));
    const denom = 1 - lastFlow;
    if (denom > 0) {
      min = Math.max(min, (FLOW_TO_ERROR_MIN_GAP + ERROR_PORT_INSET) / denom);
    }
  }
  return Math.ceil(min);
}

/**
 * Pixel center of a flow port on the source edge — the center sits ON the
 * border line (straddle). Used by geometry tests and pending connectors.
 */
export function portCenterOnSourceEdge(
  nodeBounds: {
    readonly minX: number;
    readonly minY: number;
    readonly maxX: number;
    readonly maxY: number;
  },
  alongFraction: number,
  direction: LayoutDirection
): { x: number; y: number } {
  if (direction === 'LR') {
    return {
      x: nodeBounds.maxX,
      y: nodeBounds.minY + (nodeBounds.maxY - nodeBounds.minY) * alongFraction,
    };
  }
  return {
    x: nodeBounds.minX + (nodeBounds.maxX - nodeBounds.minX) * alongFraction,
    y: nodeBounds.maxY,
  };
}

/**
 * Error-port center — always bottom edge, ERROR_PORT_INSET from the right.
 * Identical in TB and LR (orientation-invariant corner anchor).
 */
export function errorPortCenter(
  nodeBounds: {
    readonly minX: number;
    readonly minY: number;
    readonly maxX: number;
    readonly maxY: number;
  },
  _direction?: LayoutDirection
): { x: number; y: number } {
  return { x: nodeBounds.maxX - ERROR_PORT_INSET, y: nodeBounds.maxY };
}

export const isHorizontalDirection = (direction: LayoutDirection): boolean => direction === 'LR';

/** Cross-axis position style for a React Flow Handle on the flow source edge. */
export const handleAlongStyle = (
  along: string,
  isHorizontal: boolean
): CSSProperties => (isHorizontal ? { top: along } : { left: along });

/**
 * Absolute-position style for the error port: bottom edge, right inset,
 * straddling the border. Same in both orientations — do not put the error
 * port on the right edge in LR.
 */
export const errorPortEdgeStyle = (
  straddleOutset: number = PORT_STRADDLE_OUTSET
): CSSProperties => ({
  left: 'auto',
  right: ERROR_PORT_INSET,
  bottom: -straddleOutset,
  // `right` + translateX(50%): positive X shifts toward the left of the card,
  // centering the hit target on the inset.
  transform: 'translateX(50%)',
});

/**
 * Handle style for the error source handle. Always on the bottom edge
 * (`Position.Bottom`); inset from the right via left calc.
 */
export const errorHandleStyle = (): CSSProperties => ({
  left: ERROR_PORT_ALONG,
});

/**
 * Centers of all ports on a node when fully expanded (for overlap regression).
 * Flow ports sit on the outgoing edge; error stays at the bottom-right corner.
 */
export function expandedPortCenters(
  nodeWidth: number,
  nodeHeight: number,
  flowCount: number,
  hasErrorPort: boolean,
  direction: LayoutDirection
): Array<{ x: number; y: number; kind: 'flow' | 'error' }> {
  const bounds = { minX: 0, minY: 0, maxX: nodeWidth, maxY: nodeHeight };
  const centers: Array<{ x: number; y: number; kind: 'flow' | 'error' }> = [];
  for (let i = 0; i < flowCount; i++) {
    centers.push({
      ...portCenterOnSourceEdge(bounds, flowPortFraction(i, flowCount), direction),
      kind: 'flow',
    });
  }
  if (hasErrorPort) {
    centers.push({ ...errorPortCenter(bounds, direction), kind: 'error' });
  }
  return centers;
}

/** True when every pair of expanded ports (radius = PORT_EXPANDED_SIZE/2) is clear. */
export function expandedPortsClear(
  nodeWidth: number,
  nodeHeight: number,
  flowCount: number,
  hasErrorPort: boolean,
  direction: LayoutDirection
): boolean {
  const centers = expandedPortCenters(
    nodeWidth,
    nodeHeight,
    flowCount,
    hasErrorPort,
    direction
  );
  const minDist = PORT_EXPANDED_SIZE; // diameter = 2 * radius clearance
  for (let i = 0; i < centers.length; i++) {
    for (let j = i + 1; j < centers.length; j++) {
      const dx = centers[i].x - centers[j].x;
      const dy = centers[i].y - centers[j].y;
      if (Math.hypot(dx, dy) < minDist - 1e-6) return false;
    }
  }
  return true;
}
