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

interface SnapResult {
  dx: number;
  dy: number;
}

/** Snaps a value to the nearest multiple of `step`, offset by `origin`. */
const snap = (value: number, step: number, origin = 0): number =>
  Math.round((value - origin) / step) * step + origin;

/**
 * Snaps a value but only if it falls within the layout extent.
 * Returns the original value unchanged when outside the layout area.
 */
const snapWithinBounds = (value: number, step: number, origin: number, extent: number): number => {
  const snapped = snap(value, step, origin);
  if (snapped < origin || snapped > origin + extent) return value;
  return snapped;
};

/**
 * Snaps a dragged element's position to the nearest grid line based on the active layout config.
 * Takes the element's original position and total drag delta, computes the resulting absolute
 * position, snaps it to the nearest grid line, and returns the adjusted delta.
 *
 * - **grid**: snaps both axes to `cellSize` increments (origin 0,0).
 * - **columns**: snaps X to column left edges within the layout extent, Y unchanged.
 * - **rows**: snaps Y to row top edges within the layout extent, X unchanged.
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
    const count = Math.max(1, config.count);
    const step = columnWidth + config.gutterSize;
    const extent = count * columnWidth + (count - 1) * config.gutterSize;
    return {
      dx: snapWithinBounds(absX, step, offsetLeft, extent) - originX,
      dy,
    };
  }

  const { rowHeight, offsetTop } = calculateRowLayout(config, viewportHeight);
  const count = Math.max(1, config.count);
  const step = rowHeight + config.gutterSize;
  const extent = count * rowHeight + (count - 1) * config.gutterSize;
  return {
    dx,
    dy: snapWithinBounds(absY, step, offsetTop, extent) - originY,
  };
};
