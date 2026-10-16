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
import { PORT_HIT_SIZE } from './workflow_graph_geometry';

// Port sizes live in the geometry module; re-exported for existing importers.
export {
  PORT_DOT_SIZE,
  PORT_EDGE_OUTSET,
  PORT_EXPANDED_SIZE,
  PORT_HIT_SIZE,
} from './workflow_graph_geometry';

/** Flow-port band for N ≥ 2 (fraction of the source-edge length). */
export const FLOW_BAND_START = 0.32;
export const FLOW_BAND_END = 0.68;
const FLOW_BAND_SPAN = FLOW_BAND_END - FLOW_BAND_START; // 0.36

/**
 * Error-port fraction along the bottom edge. Sits a short way into the trailing
 * band past flow ports (`FLOW_BAND_END`…`1`) — closer to mid-card than centering
 * in that band (which pushed the port too far toward the right corner).
 */
export const ERROR_PORT_TRAIL_T = 0.2;
export const ERROR_PORT_FRACTION = FLOW_BAND_END + (1 - FLOW_BAND_END) * ERROR_PORT_TRAIL_T;

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
export const handleAlongStyle = (along: string, isHorizontal: boolean): CSSProperties =>
  isHorizontal ? { top: along } : { left: along };

/**
 * Absolute-position style for the error port: bottom edge at ERROR_PORT_FRACTION,
 * hit box straddling the border so the pin sits on the edge (same as before the
 * 15px flow-port outset). Same in both orientations — do not put the error
 * port on the right edge in LR.
 */
export const errorPortEdgeStyle = (straddleOutset: number = PORT_HIT_SIZE / 2): CSSProperties => ({
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
