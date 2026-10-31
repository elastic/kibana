/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LATENCY_MAP_ROWS } from '../query/duration_rows';
import { getTimeGrid } from '../query/time_grid';
import type { DurationStats } from '../types';
import { createMapGeometry, findHandle } from './map_geometry';

const stats: DurationStats = {
  min: 100,
  p90: 5000,
  p95: 8000,
  p99: 10_000,
  max: 2_000_000,
  spans: 10,
};
const timeGrid = getTimeGrid('2026-10-26T10:00:00.000Z', '2026-10-26T11:00:00.000Z', 60);
// The chart put 60 columns of 9.6 px and 24 rows of 10 px at (64, 14).
const geometry = createMapGeometry({
  plot: { left: 64, top: 14, colWidth: 9.6, rowHeight: 10 },
  timeGrid,
  stats,
});

describe('createMapGeometry', () => {
  it('lays columns and rows out where the chart put them', () => {
    expect(geometry.bins).toBe(60);
    expect(geometry.rows).toBe(LATENCY_MAP_ROWS);
    expect(geometry.plotRight).toBeCloseTo(64 + 576);
    expect(geometry.plotBottom).toBeCloseTo(14 + 240);
    expect(geometry.edgeToX(0)).toBe(64);
    expect(geometry.edgeToY(0)).toBe(geometry.plotBottom);
    expect(geometry.edgeToY(LATENCY_MAP_ROWS)).toBeCloseTo(14);
  });

  it('finds the cell under a point, and none outside the plot', () => {
    const point = { x: geometry.plotLeft + 25, y: geometry.plotBottom - 25 };
    expect(geometry.pointToCell(point)).toEqual({ xi: 2, yi: 2 });
    expect(geometry.pointToCell({ x: 0, y: 0 })).toBeUndefined();
    expect(geometry.pointToCell({ x: geometry.plotRight, y: geometry.plotTop })).toEqual({
      xi: 59,
      yi: 23,
    });
  });

  it('snaps a point to the nearest edges', () => {
    expect(
      geometry.pointToEdge({ x: geometry.plotLeft + 25, y: geometry.plotBottom - 24 })
    ).toEqual({
      x: 3,
      y: 2,
    });
  });

  it('clamps a point to the plot', () => {
    expect(geometry.clampToPlot({ x: -50, y: 9999 })).toEqual({
      x: geometry.plotLeft,
      y: geometry.plotBottom,
    });
  });

  describe('selections', () => {
    const range = { x0: 10, x1: 13, y0: 4, y1: 9 };

    it('carries the exact bounds of its cells', () => {
      const selection = geometry.rangeToSelection(range);
      expect(selection.from).toBe('2026-10-26T10:10:00.000Z');
      expect(selection.to).toBe('2026-10-26T10:13:00.000Z');
      expect(selection.minDuration).toBeGreaterThan(100);
      expect(selection.maxDuration).toBeGreaterThan(selection.minDuration);
      expect(geometry.selectionToRange(selection)).toEqual(range);
    });

    it('reads everything faster than the first row from the bottom row', () => {
      expect(geometry.rangeToSelection({ x0: 0, x1: 1, y0: 0, y1: 1 }).minDuration).toBe(0);
    });

    it('reads everything slower than the p99 from the top row, up to the max', () => {
      const top = geometry.rangeToSelection({ x0: 0, x1: 1, y0: 23, y1: 24 });
      expect(top.minDuration).toBeCloseTo(stats.p99);
      expect(top.maxDuration).toBeGreaterThan(stats.max);
    });

    it('marks a selection about failures', () => {
      expect(geometry.rangeToSelection(range, true).failedOnly).toBe(true);
      expect(geometry.rangeToSelection(range)).not.toHaveProperty('failedOnly');
    });

    it('keeps a host selection of any bounds inside the grid, a cell at least', () => {
      expect(
        geometry.selectionToRange({
          from: '2020-01-01T00:00:00.000Z',
          to: '2020-01-01T00:00:00.000Z',
          minDuration: 1,
          maxDuration: 1,
        })
      ).toEqual({ x0: 0, x1: 1, y0: 0, y1: 1 });
    });

    it('turns a range into the pixels of its cells', () => {
      expect(geometry.rangeToRect({ x0: 0, x1: 60, y0: 0, y1: 24 })).toEqual({
        x0: geometry.plotLeft,
        x1: geometry.plotRight,
        y0: geometry.plotTop,
        y1: geometry.plotBottom,
      });
    });
  });

  it('finds the handle under a point', () => {
    const rect = geometry.rangeToRect({ x0: 10, x1: 13, y0: 4, y1: 9 });
    const handles = geometry.getHandles(rect);
    expect(handles).toHaveLength(8);
    expect(findHandle({ x: rect.x1 + 2, y: rect.y0 - 2 }, handles, rect)).toBe('tr');
    expect(findHandle({ x: (rect.x0 + rect.x1) / 2, y: rect.y1 }, handles, rect)).toBe('b');
    expect(findHandle({ x: rect.x0 + 20, y: rect.y0 + 20 }, handles, rect)).toBeUndefined();
  });

  it('keeps the middle of a small selection free of handles, so that it can be moved', () => {
    // Three columns of 9.6 px and two rows of 10 px: handles reaching 7 px would cover it all.
    const rect = geometry.rangeToRect({ x0: 10, x1: 13, y0: 4, y1: 6 });
    const handles = geometry.getHandles(rect);
    const middle = { x: (rect.x0 + rect.x1) / 2, y: (rect.y0 + rect.y1) / 2 };
    expect(findHandle({ x: middle.x - 6, y: middle.y }, handles, rect)).toBeUndefined();
    // The corners are still there to grab.
    expect(findHandle({ x: rect.x0, y: rect.y0 }, handles, rect)).toBe('tl');
  });

  it('ends a selection at the end of the range, not at the end of the padded last column', () => {
    // 70 columns of 51,429 ms cover 30 ms more than the hour.
    const padded = getTimeGrid('2026-10-26T10:00:00.000Z', '2026-10-26T11:00:00.000Z', 70);
    expect(padded.bins * padded.binMs).toBeGreaterThan(padded.endMs - padded.fromMs);
    const geometryOf70 = createMapGeometry({
      plot: { left: 0, top: 0, colWidth: 8, rowHeight: 8 },
      timeGrid: padded,
      stats,
    });
    const last = geometryOf70.rangeToSelection({
      x0: padded.bins - 1,
      x1: padded.bins,
      y0: 0,
      y1: 24,
    });
    expect(last.to).toBe('2026-10-26T11:00:00.000Z');
    // A column inside the range is not cut.
    const first = geometryOf70.rangeToSelection({ x0: 1, x1: 2, y0: 0, y1: 24 });
    expect(Date.parse(first.to) - Date.parse(first.from)).toBe(padded.binMs);
  });

  it('starts a selection at the start of the range, not at the aligned start of the first column', () => {
    // A live range: aligning the columns puts the first one 5,052 ms before the range.
    const aligned = getTimeGrid('2026-10-30T15:53:12.552Z', '2026-10-30T16:08:12.552Z', 120);
    expect(aligned.fromMs).toBeLessThan(aligned.startMs);
    const alignedGeometry = createMapGeometry({
      plot: { left: 0, top: 0, colWidth: 8, rowHeight: 8 },
      timeGrid: aligned,
      stats,
    });
    const first = alignedGeometry.rangeToSelection({ x0: 0, x1: 2, y0: 0, y1: 24 });
    expect(first.from).toBe('2026-10-30T15:53:12.552Z');
    // And the selection comes back as the same columns.
    expect(alignedGeometry.selectionToRange(first)).toEqual({ x0: 0, x1: 2, y0: 0, y1: 24 });
  });

  it('restores a full-width selection whole when the last column is under half a bin wide', () => {
    // One second in 85 columns of 12 ms is 84 columns, and the last has 4 ms of range.
    const clipped = getTimeGrid('2026-10-26T10:00:00.000Z', '2026-10-26T10:00:01.000Z', 85);
    const clippedGeometry = createMapGeometry({
      plot: { left: 0, top: 0, colWidth: 8, rowHeight: 8 },
      timeGrid: clipped,
      stats,
    });
    const full = { x0: 0, x1: clipped.bins, y0: 0, y1: 24 };
    const selection = clippedGeometry.rangeToSelection(full);
    expect(selection.to).toBe('2026-10-26T10:00:01.000Z');
    expect(clippedGeometry.selectionToRange(selection)).toEqual(full);

    const last = { x0: clipped.bins - 1, x1: clipped.bins, y0: 3, y1: 9 };
    expect(clippedGeometry.selectionToRange(clippedGeometry.rangeToSelection(last))).toEqual(last);
  });
});
