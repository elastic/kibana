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
  /** Where the first column starts: aligned onto the raster, it may sit before the range. */
  fromMs: number;
  binMs: number;
  /** Columns. The first and the last one may reach past the range, where there are no spans. */
  bins: number;
  /** The end of the range itself: the grid may reach past it, a selection must not. */
  endMs: number;
  /** The start of the range itself: the grid may begin before it, a selection must not. */
  startMs: number;
}

export function getTimeGrid(from: string, to: string, targetBins: number): TimeGrid {
  const startMs = Date.parse(from);
  const endMs = Math.max(startMs + 1, Date.parse(to));
  const binMs = Math.max(1, Math.ceil((endMs - startMs) / Math.max(1, targetBins)));
  // Columns sit on multiples of the column width: the chart rasters its time scale onto
  // epoch-aligned buckets of that width (in UTC, see `LatencyHeatmap`), and a column off
  // that raster would match no bucket and draw no cells.
  const fromMs = Math.floor(startMs / binMs) * binMs;
  return { fromMs, binMs, bins: Math.ceil((endMs - fromMs) / binMs), endMs, startMs };
}

/**
 * Where a timestamp falls among the column edges (`0..bins`, fractions inside a column). The first
 * and the last column may reach past the range, where the map read no spans, so only their part
 * inside the range counts, and that part is the whole column: the start of the range is the first
 * edge, `0`, and the end of the range the final one, `bins`. This keeps a selection bounded by the
 * range a whole number of columns, and the counts of a selection over an edge column against the
 * width of data it really has.
 */
export function timeToEdge(grid: TimeGrid, timestampMs: number): number {
  const { fromMs, binMs, bins, endMs, startMs } = grid;
  const firstEnd = Math.min(fromMs + binMs, endMs);
  if (timestampMs < firstEnd) {
    const inRange = Math.max(1, firstEnd - startMs);
    return Math.min(1, Math.max(0, (timestampMs - startMs) / inRange));
  }
  const lastStart = fromMs + (bins - 1) * binMs;
  if (timestampMs < lastStart) return (timestampMs - fromMs) / binMs;
  const inRange = Math.max(1, endMs - lastStart);
  return bins - 1 + Math.min(1, (timestampMs - lastStart) / inRange);
}
