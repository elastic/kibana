/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LayoutConfig } from '../layout/layout_config';
import { calculateColumnLayout, calculateRowLayout } from '../layout/calculate_layout';

export interface SnapResult {
  dx: number;
  dy: number;
}

/** Snap a value to the nearest multiple of `step`, offset by `origin`. */
const snap = (value: number, step: number, origin = 0): number =>
  Math.round((value - origin) / step) * step + origin;

/**
 * Snaps a dragged element's position to the nearest grid line based on the active layout config.
 * Takes the element's original position and total drag delta, computes the resulting absolute
 * position, snaps it to the nearest grid line, and returns the adjusted delta.
 *
 * - **grid**: snaps both axes to `cellSize` increments (origin 0,0).
 * - **columns**: snaps X to column left edges (accounts for margin offset), Y unchanged.
 * - **rows**: snaps Y to row top edges (accounts for margin offset), X unchanged.
 */
export const snapToGrid = (
  dx: number,
  dy: number,
  originX: number,
  originY: number,
  config: LayoutConfig,
  viewportWidth: number,
  viewportHeight: number
): SnapResult => {
  const absX = originX + dx;
  const absY = originY + dy;

  if (config.layoutType === 'grid') {
    const size = config.cellSize > 0 ? config.cellSize : 32;
    return {
      dx: snap(absX, size) - originX,
      dy: snap(absY, size) - originY,
    };
  }

  if (config.layoutType === 'columns') {
    const { columnWidth, offsetLeft } = calculateColumnLayout(config, viewportWidth);
    const step = columnWidth + config.gutterSize;
    return {
      dx: snap(absX, step, offsetLeft) - originX,
      dy,
    };
  }

  const { rowHeight, offsetTop } = calculateRowLayout(config, viewportHeight);
  const step = rowHeight + config.gutterSize;
  return {
    dx,
    dy: snap(absY, step, offsetTop) - originY,
  };
};
