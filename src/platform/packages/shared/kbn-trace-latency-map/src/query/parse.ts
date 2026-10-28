/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsqlTable } from '../types';
import { LATENCY_MAP_ROWS } from './duration_rows';

export interface GridCell {
  xi: number;
  yi: number;
  spans: number;
  failed: number;
}

export interface LatencyGrid {
  bins: number;
  /** Keyed by {@link getCellKey}. */
  cells: Map<number, GridCell>;
  maxSpans: number;
}

export const getCellKey = (xi: number, yi: number, bins: number) => yi * bins + xi;

export const createEmptyGrid = (bins: number): LatencyGrid => ({
  bins,
  cells: new Map(),
  maxSpans: 0,
});

/**
 * Adds the table of one grid query to a grid. `scale` is how many spans each counted span
 * stands for: 1, or 1 / probability for the sampled part of a large range.
 */
export function addTableToGrid(grid: LatencyGrid, table: EsqlTable, scale = 1): LatencyGrid {
  const [xiIndex, yiIndex, spansIndex, failedIndex] = ['xi', 'yi', 'spans', 'failed'].map((name) =>
    table.columns.findIndex((column) => column.name === name)
  );
  const cells = new Map(grid.cells);
  let maxSpans = grid.maxSpans;
  for (const row of table.values) {
    const xi = Number(row[xiIndex]);
    const yi = Number(row[yiIndex]);
    if (!(xi >= 0 && xi < grid.bins && yi >= 0 && yi < LATENCY_MAP_ROWS)) continue;
    const key = getCellKey(xi, yi, grid.bins);
    const before = cells.get(key);
    const spans = (before?.spans ?? 0) + Math.round(Number(row[spansIndex]) * scale);
    const failed = (before?.failed ?? 0) + Math.round(Number(row[failedIndex]) * scale);
    cells.set(key, { xi, yi, spans, failed: Math.min(failed, spans) });
    maxSpans = Math.max(maxSpans, spans);
  }
  return { bins: grid.bins, cells, maxSpans };
}
