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
      expect(selection.minDurationUs).toBeGreaterThan(100);
      expect(selection.maxDurationUs).toBeGreaterThan(selection.minDurationUs);
      expect(geometry.selectionToRange(selection)).toEqual(range);
    });

    it('reads everything faster than the first row from the bottom row', () => {
      expect(geometry.rangeToSelection({ x0: 0, x1: 1, y0: 0, y1: 1 }).minDurationUs).toBe(0);
    });

    it('reads everything slower than the p99 from the top row, up to the max', () => {
      const top = geometry.rangeToSelection({ x0: 0, x1: 1, y0: 23, y1: 24 });
      expect(top.minDurationUs).toBeCloseTo(stats.p99);
      expect(top.maxDurationUs).toBeGreaterThan(stats.max);
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
          minDurationUs: 1,
          maxDurationUs: 1,
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
});
