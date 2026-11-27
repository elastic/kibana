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
  it('draws without a selection, and outside the one there', () => {
    expect(startGesture(at(12, 6), geometry)).toEqual({
      kind: 'drawing',
      origin: at(12, 6),
      rawOrigin: at(12, 6),
    });
    expect(startGesture(at(40, 20), geometry, range)).toEqual({
      kind: 'drawing',
      origin: at(40, 20),
      rawOrigin: at(40, 20),
    });
  });

  it('draws the cells between the press and the pointer, whichever way the drag runs', () => {
    const down = startGesture(at(10, 20), geometry);
    const downRange = endGesture(down, at(14, 16), geometry);
    const up = startGesture(at(14, 16), geometry);
    const upRange = endGesture(up, at(10, 20), geometry);
    expect(downRange).toEqual({ type: 'range', range: { x0: 10, x1: 15, y0: 16, y1: 21 } });
    expect(upRange).toEqual(downRange);
  });

  it('clamps a draw from above the plot to the top row, and keeps it inside the plot', () => {
    const gesture = startGesture({ x: geometry.edgeToX(10.5), y: geometry.plotTop - 6 }, geometry);
    expect(gesture.kind).toBe('drawing');
    expect(moveGesture(gesture, { x: geometry.edgeToX(14.5), y: 99_999 }, geometry)).toEqual({
      x0: 10,
      x1: 15,
      y0: 0,
      y1: 24,
    });
  });

  it('reads a draw press that does not travel as a click on the cell', () => {
    const gesture = startGesture(at(12, 6), geometry);
    expect(endGesture(gesture, { x: at(12, 6).x + 1, y: at(12, 6).y }, geometry)).toEqual({
      type: 'click',
      cell: { xi: 12, yi: 6 },
    });
  });

  it('reads a stationary press outside the plot as nothing, not a drag to the edge', () => {
    // On a y-axis label: the clamped anchor is ~26px away, but the pointer never moved.
    const press = { x: geometry.plotLeft - 26, y: geometry.edgeToY(6.5) };
    const gesture = startGesture(press, geometry);
    expect(endGesture(gesture, { x: press.x + 1, y: press.y }, geometry)).toEqual({
      type: 'none',
    });
    // Above the plot, in the grab band: a stationary press does nothing either.
    const above = { x: geometry.edgeToX(10.5), y: geometry.plotTop - 6 };
    expect(endGesture(startGesture(above, geometry), above, geometry)).toEqual({ type: 'none' });
  });

  it('draws at least one cell once the press travels past the click threshold', () => {
    const origin = at(12, 6);
    const gesture = startGesture(origin, geometry);
    // Past the threshold (hypot of 3,3) but still inside the cell the press started on.
    expect(endGesture(gesture, { x: origin.x + 3, y: origin.y + 3 }, geometry)).toEqual({
      type: 'range',
      range: { x0: 12, x1: 13, y0: 6, y1: 7 },
    });
  });

  it('moves a region by whole cells', () => {
    const gesture = startGesture(at(12, 6), geometry, range);
    expect(gesture.kind).toBe('moving');
    expect(endGesture(gesture, at(15, 8), geometry)).toEqual({
      type: 'range',
      range: { x0: 13, x1: 17, y0: 6, y1: 10 },
    });
  });

  it('stops a move at the edge of the grid', () => {
    const gesture = startGesture(at(12, 6), geometry, range);
    expect(moveGesture(gesture, { x: 99_999, y: -99_999 }, geometry)).toEqual({
      x0: 56,
      x1: 60,
      y0: 20,
      y1: 24,
    });
  });

  it('reads a press inside the region that does not travel as a click on the cell', () => {
    const gesture = startGesture(at(12, 6), geometry, range);
    expect(endGesture(gesture, { x: at(12, 6).x + 1, y: at(12, 6).y }, geometry)).toEqual({
      type: 'click',
      cell: { xi: 12, yi: 6 },
    });
  });

  it('resizes a region from a handle, which wins over moving', () => {
    const rect = geometry.rangeToRect(range);
    const gesture = startGesture({ x: rect.x1, y: rect.y0 }, geometry, range);
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
    const gesture = startGesture({ x: rect.x1, y: rect.y0 }, geometry, range);
    expect(moveGesture(gesture, { x: 99_999, y: -99_999 }, geometry)).toEqual({
      x0: 10,
      x1: 60,
      y0: 4,
      y1: 24,
    });
  });
});
