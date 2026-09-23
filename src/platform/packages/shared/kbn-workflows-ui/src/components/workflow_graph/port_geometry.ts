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
/** Invisible hit target — must stay ≥44 so the control is never the only clickable area. */
export const PORT_HIT_SIZE = 44;

/**
 * Outset that places the control centre ≈15px outside the source edge
 * (prompt: just outside the node's outgoing edge). Hit padding expands around
 * that centre without contributing layout size to the node.
 */
export const PORT_EDGE_OUTSET = 15;
/** @deprecated Prefer PORT_EDGE_OUTSET — kept as alias during the straddle → edge migrate. */
export const PORT_STRADDLE_OUTSET = PORT_EDGE_OUTSET;

/** Flow-port band for N ≥ 2 (fraction of the source-edge length). */
export const FLOW_BAND_START = 0.32;
export const FLOW_BAND_END = 0.68;
const FLOW_BAND_SPAN = FLOW_BAND_END - FLOW_BAND_START; // 0.36

/** Minimum center-to-center gap between adjacent flow ports (px). */
export const FLOW_PORT_MIN_GAP = 28;
/** Minimum gap between the last flow port and the error port (px). */
export const FLOW_TO_ERROR_MIN_GAP = 20;

/**
 * Error-port fraction along the bottom edge. Sits a short way into the trailing
 * band past flow ports (`FLOW_BAND_END`…`1`) — closer to mid-card than centering
 * in that band (which pushed the port too far toward the right corner).
 */
export const ERROR_PORT_TRAIL_T = 0.2;
export const ERROR_PORT_FRACTION = FLOW_BAND_END + (1 - FLOW_BAND_END) * ERROR_PORT_TRAIL_T;

/** @deprecated Prefer ERROR_PORT_FRACTION / errorPortCenter. */
export const ERROR_PORT_INSET = ERROR_PORT_FRACTION;
/** @deprecated Prefer ERROR_PORT_FRACTION / errorPortCenter. */
export const ERROR_PORT_OFFSET = ERROR_PORT_FRACTION;

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
 * CSS percentage for the error-port center along the bottom edge.
 */
export const ERROR_PORT_ALONG = `${ERROR_PORT_FRACTION * 100}%`;

/** @deprecated Prefer ERROR_PORT_ALONG / errorPortEdgeStyle. */
export const STEP_ERROR_PORT = ERROR_PORT_ALONG;
/** @deprecated Prefer ERROR_PORT_ALONG — if and step share the same placement. */
export const IF_PORT_ERROR = ERROR_PORT_ALONG;

/**
 * Minimum node WIDTH so flow ports on the bottom edge (TB) keep ≥28px gaps and
 * the last flow port stays ≥20px from the error port. Also used as the height
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
    // Same-edge clearance along the bottom (TB).
    const lastFlow = flowPortFraction(Math.max(flowCount - 1, 0), Math.max(flowCount, 1));
    const denom = ERROR_PORT_FRACTION - lastFlow;
    if (denom > 0) {
      min = Math.max(min, FLOW_TO_ERROR_MIN_GAP / denom);
    }
  }
  return Math.ceil(min);
}

/**
 * Pixel center of a flow port on the source edge — ≈PORT_EDGE_OUTSET outside
 * the border. Used by geometry tests and pending connectors.
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
      x: nodeBounds.maxX + PORT_EDGE_OUTSET,
      y: nodeBounds.minY + (nodeBounds.maxY - nodeBounds.minY) * alongFraction,
    };
  }
  return {
    x: nodeBounds.minX + (nodeBounds.maxX - nodeBounds.minX) * alongFraction,
    y: nodeBounds.maxY + PORT_EDGE_OUTSET,
  };
}

/**
 * Error-port center — always bottom edge at ERROR_PORT_FRACTION along the width.
 * Identical in TB and LR (orientation-invariant bottom-edge anchor).
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
  const width = nodeBounds.maxX - nodeBounds.minX;
  return {
    x: nodeBounds.minX + width * ERROR_PORT_FRACTION,
    y: nodeBounds.maxY,
  };
}

export const isHorizontalDirection = (direction: LayoutDirection): boolean => direction === 'LR';

/** Cross-axis position style for a React Flow Handle on the flow source edge. */
export const handleAlongStyle = (
  along: string,
  isHorizontal: boolean
): CSSProperties => (isHorizontal ? { top: along } : { left: along });

/**
 * Absolute-position style for the error port: bottom edge at ERROR_PORT_FRACTION,
 * hit box straddling the border so the pin sits on the edge (same as before the
 * 15px flow-port outset). Same in both orientations — do not put the error
 * port on the right edge in LR.
 */
export const errorPortEdgeStyle = (
  straddleOutset: number = PORT_HIT_SIZE / 2
): CSSProperties => ({
  left: ERROR_PORT_ALONG,
  right: 'auto',
  bottom: -straddleOutset,
  transform: 'translateX(-50%)',
});

/**
 * Handle style for the error source handle. Always on the bottom edge
 * (`Position.Bottom`); along-fraction via left percentage.
 */
export const errorHandleStyle = (): CSSProperties => ({
  left: ERROR_PORT_ALONG,
});

/**
 * Centers of all ports on a node when fully expanded (for overlap regression).
 * Flow ports sit on the outgoing edge; error stays on the bottom edge.
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
