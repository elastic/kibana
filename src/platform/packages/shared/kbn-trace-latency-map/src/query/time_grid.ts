/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * The time columns of a map. A whole number of milliseconds per column, so a column edge is
 * an exact timestamp a selection can carry into a condition.
 */
export interface TimeGrid {
  fromMs: number;
  binMs: number;
  /** Columns. The last one may reach past the range, where there are no spans. */
  bins: number;
  /** The end of the range itself: the grid may reach past it, a selection must not. */
  endMs: number;
}

export function getTimeGrid(from: string, to: string, targetBins: number): TimeGrid {
  const fromMs = Date.parse(from);
  const rangeMs = Math.max(1, Date.parse(to) - fromMs);
  const binMs = Math.max(1, Math.ceil(rangeMs / Math.max(1, targetBins)));
  return { fromMs, binMs, bins: Math.ceil(rangeMs / binMs), endMs: fromMs + rangeMs };
}

/**
 * Where a timestamp falls among the column edges (`0..bins`, fractions inside a column). The last
 * column may reach past the range, where the map read no spans, so only its part inside the range
 * counts, and that part is the whole column: the end of the range is the final edge, `bins`. This
 * keeps a selection that ends at the end of the range a whole number of columns, and the counts
 * of a selection over that column against the width of data it really has.
 */
export function timeToEdge({ fromMs, binMs, bins, endMs }: TimeGrid, timestampMs: number): number {
  const lastStart = fromMs + (bins - 1) * binMs;
  if (timestampMs < lastStart) return (timestampMs - fromMs) / binMs;
  const inRange = Math.max(1, endMs - lastStart);
  return bins - 1 + Math.min(1, (timestampMs - lastStart) / inRange);
}
