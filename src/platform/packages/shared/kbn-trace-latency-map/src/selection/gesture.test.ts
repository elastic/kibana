/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getTimeGrid } from '../query/time_grid';
import { createMapGeometry } from '../geometry/map_geometry';
import type { Point } from '../geometry/map_geometry';
import { endGesture, moveGesture, startGesture } from './gesture';

const geometry = createMapGeometry({
  plot: { left: 64, top: 14, colWidth: 9.6, rowHeight: 10 },
  timeGrid: getTimeGrid('2026-10-26T10:00:00.000Z', '2026-10-26T11:00:00.000Z', 60),
  stats: { min: 100, p90: 0, p95: 0, p99: 10_000, max: 2_000_000, spans: 10 },
});
const at = (xi: number, yi: number): Point => ({
  x: geometry.edgeToX(xi + 0.5),
  y: geometry.edgeToY(yi + 0.5),
});
const range = { x0: 10, x1: 14, y0: 4, y1: 8 };

describe('selection gestures', () => {
  it('starts nothing without a selection, or outside it', () => {
    expect(startGesture(at(12, 6), geometry)).toBeUndefined();
    expect(startGesture(at(40, 20), geometry, range)).toBeUndefined();
  });

  it('moves a region by whole cells', () => {
    const gesture = startGesture(at(12, 6), geometry, range)!;
    expect(gesture.kind).toBe('moving');
    expect(endGesture(gesture, at(15, 8), geometry)).toEqual({
      type: 'range',
      range: { x0: 13, x1: 17, y0: 6, y1: 10 },
    });
  });

  it('stops a move at the edge of the grid', () => {
    const gesture = startGesture(at(12, 6), geometry, range)!;
    expect(moveGesture(gesture, { x: 99_999, y: -99_999 }, geometry)).toEqual({
      x0: 56,
      x1: 60,
      y0: 20,
      y1: 24,
    });
  });

  it('reads a press inside the region that does not travel as a click on the cell', () => {
    const gesture = startGesture(at(12, 6), geometry, range)!;
    expect(endGesture(gesture, { x: at(12, 6).x + 1, y: at(12, 6).y }, geometry)).toEqual({
      type: 'click',
      cell: { xi: 12, yi: 6 },
    });
  });

  it('resizes a region from a handle, which wins over moving', () => {
    const rect = geometry.rangeToRect(range);
    const gesture = startGesture({ x: rect.x1, y: rect.y0 }, geometry, range)!;
    expect(gesture).toEqual({ kind: 'resizing', handle: 'tr', start: range });
    expect(
      endGesture(gesture, { x: geometry.edgeToX(20), y: geometry.edgeToY(12) }, geometry)
    ).toEqual({
      type: 'range',
      range: { x0: 10, x1: 20, y0: 4, y1: 12 },
    });
  });

  it('keeps a resize inside the plot when the pointer leaves it', () => {
    const rect = geometry.rangeToRect(range);
    const gesture = startGesture({ x: rect.x1, y: rect.y0 }, geometry, range)!;
    expect(moveGesture(gesture, { x: 99_999, y: -99_999 }, geometry)).toEqual({
      x0: 10,
      x1: 60,
      y0: 4,
      y1: 24,
    });
  });
});
