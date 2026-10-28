/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CellRange } from '../geometry/cell_range';
import type { TimeGrid } from '../query/time_grid';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * The cells of the chart's brush. The chart reports the time span of the dragged cells, ending
 * after the last one, and the rows inside it.
 */
export function brushToRange(
  x: Array<string | number>,
  y: Array<string | number>,
  { fromMs, binMs, bins }: TimeGrid,
  rows: number
): CellRange | undefined {
  const times = x.map(Number).filter(Number.isFinite);
  const rowValues = y.map(Number).filter(Number.isFinite);
  if (!times.length || !rowValues.length) return undefined;
  const x0 = clamp(Math.round((Math.min(...times) - fromMs) / binMs), 0, bins - 1);
  const x1 = clamp(Math.round((Math.max(...times) - fromMs) / binMs), x0 + 1, bins);
  const y0 = clamp(Math.min(...rowValues), 0, rows - 1);
  const y1 = clamp(Math.max(...rowValues) + 1, y0 + 1, rows);
  return { x0, x1, y0, y1 };
}

/**
 * The time span and rows of a range of cells, as the chart's `highlightedData` takes them. The
 * chart starts the area at the first row and runs it down, so rows go from the top: the slowest,
 * as the rows are sorted descending.
 */
export function rangeToHighlight(range: CellRange, { fromMs, binMs }: TimeGrid) {
  return {
    x: [fromMs + range.x0 * binMs, fromMs + range.x1 * binMs],
    y: Array.from({ length: range.y1 - range.y0 }, (_, i) => range.y1 - 1 - i),
  };
}
