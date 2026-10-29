/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getTimeGrid } from '../query/time_grid';
import { durationUsToRow, rowToDurationUs } from '../query/duration_rows';
import type { LatencyGrid } from '../query/parse';
import type { DurationStats, LatencyMapSelection } from '../types';
import { createMapGeometry } from '../geometry/map_geometry';
import { getSelectionCounts } from './counts';

const stats: DurationStats = {
  min: 100,
  p90: 5000,
  p95: 8000,
  p99: 10_000,
  max: 2_000_000,
  spans: 1000,
};
const timeGrid = getTimeGrid('2026-10-26T10:00:00.000Z', '2026-10-26T11:00:00.000Z', 60);
const geometry = createMapGeometry({
  plot: { left: 0, top: 0, colWidth: 1, rowHeight: 1 },
  timeGrid,
  stats,
});

const gridOf = (cells: Array<[number, number, number, number]>): LatencyGrid => ({
  bins: timeGrid.bins,
  maxSpans: 0,
  cells: new Map(
    cells.map(([xi, yi, spans, failed]) => [yi * timeGrid.bins + xi, { xi, yi, spans, failed }])
  ),
});
const grid = gridOf([
  [3, 5, 40, 10],
  [4, 5, 20, 0],
  [4, 6, 8, 8],
  [30, 20, 3, 3],
]);
const at = (column: number) => timeGrid.fromMs + column * timeGrid.binMs;
const iso = (ms: number) => new Date(ms).toISOString();
const selectionOf = (x0: number, x1: number, y0: number, y1: number, failedOnly?: boolean) =>
  geometry.rangeToSelection({ x0, x1, y0, y1 }, failedOnly);
const count = (selection: LatencyMapSelection) =>
  getSelectionCounts({ grid, timeGrid, stats, selection });

describe('getSelectionCounts', () => {
  it('sums the cells of a selection that follows the cell edges, exactly', () => {
    expect(count(selectionOf(3, 5, 5, 6))).toEqual({ spans: 60, failed: 10, estimated: false });
    expect(count(selectionOf(3, 5, 5, 7))).toEqual({ spans: 68, failed: 18, estimated: false });
  });

  it('counts nothing for cells outside the selection', () => {
    expect(count(selectionOf(10, 12, 0, 3))).toEqual({ spans: 0, failed: 0, estimated: false });
  });

  it('counts a half-covered column for half its spans, and says it is an estimate', () => {
    // Half of column 3: the map was resized and the selection no longer follows its cells.
    const selection = { ...selectionOf(3, 5, 5, 6), from: iso(at(3) + timeGrid.binMs / 2) };
    expect(count(selection)).toEqual({ spans: 40, failed: 5, estimated: true });
  });

  it("counts a half-covered row for half its spans, in the map's own row scale", () => {
    const selection = {
      ...selectionOf(3, 5, 5, 6),
      minDurationUs: rowToDurationUs(5.5, stats),
    };
    expect(durationUsToRow(selection.minDurationUs, stats)).toBeCloseTo(5.5);
    expect(count(selection)).toEqual({ spans: 30, failed: 5, estimated: true });
  });

  it('counts the failed spans alone for a selection about failures', () => {
    expect(count(selectionOf(3, 5, 5, 7, true))).toEqual({
      spans: 18,
      failed: 0,
      estimated: false,
    });
  });

  it('takes the bottom and the top row whole', () => {
    expect(count(selectionOf(30, 31, 20, 24))).toEqual({ spans: 3, failed: 3, estimated: false });
    expect(count(selectionOf(0, 60, 0, 24)).spans).toBe(40 + 20 + 8 + 3);
  });

  it('does not count past the grid, nor give a number that is not one', () => {
    const wide = { ...selectionOf(0, 60, 0, 24), from: iso(at(-10)), to: iso(at(100)) };
    const counts = count(wide);
    expect(Number.isFinite(counts.spans)).toBe(true);
    expect(counts.spans).toBe(40 + 20 + 8 + 3);
  });
});
