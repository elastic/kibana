/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LAYOUT } from '../geometry/layout';
import { moveRange, rangeFromCells, resizeRange } from '../geometry/cell_range';
import type { Cell, CellRange, HandleId } from '../geometry/cell_range';
import { findHandle, isInsideRect } from '../geometry/map_geometry';
import type { MapGeometry, Point } from '../geometry/map_geometry';

/**
 * What the pointer is doing on the map: drawing a new region, or moving or resizing the one
 * there. A press that does not travel is a click on a cell.
 */
export type Gesture =
  | {
      kind: 'drawing';
      /** The press, clamped to the plot: where the drawn region anchors. */
      origin: Point;
      /** The press as it landed, for telling a click from a drag. */
      rawOrigin: Point;
    }
  | { kind: 'moving'; origin: Point; start: CellRange }
  | { kind: 'resizing'; handle: HandleId; start: CellRange };

export type GestureEnd =
  | { type: 'click'; cell: Cell }
  | { type: 'range'; range: CellRange }
  | { type: 'none' };

const cellAt = (point: Point, geometry: MapGeometry) =>
  geometry.pointToCell(geometry.clampToPlot(point))!;

/**
 * The gesture a press starts: on a handle of `range` it resizes, inside it it moves, and
 * anywhere else it draws a new region. A press just outside the plot (the axes, the margin
 * above the top row) draws from the nearest plot edge, so the edge rows and columns are easy
 * to catch, as in the prototype.
 */
export function startGesture(point: Point, geometry: MapGeometry, range?: CellRange): Gesture {
  if (range) {
    const rect = geometry.rangeToRect(range);
    const handle = findHandle(point, geometry.getHandles(rect), rect);
    if (handle) return { kind: 'resizing', handle, start: range };
    if (isInsideRect(point, rect)) return { kind: 'moving', origin: point, start: range };
  }
  return { kind: 'drawing', origin: geometry.clampToPlot(point), rawOrigin: point };
}

/** The region the gesture makes with the pointer at `point`. */
export function moveGesture(gesture: Gesture, point: Point, geometry: MapGeometry): CellRange {
  if (gesture.kind === 'drawing') {
    // Whole cells between the two corners, whichever way the drag runs.
    return rangeFromCells(cellAt(gesture.origin, geometry), cellAt(point, geometry));
  }
  if (gesture.kind === 'moving') {
    return moveRange(
      gesture.start,
      Math.round((point.x - gesture.origin.x) / geometry.colWidth),
      Math.round((gesture.origin.y - point.y) / geometry.rowHeight),
      geometry.bins,
      geometry.rows
    );
  }
  return resizeRange(
    gesture.start,
    gesture.handle,
    geometry.pointToEdge(geometry.clampToPlot(point)),
    geometry.bins,
    geometry.rows
  );
}

/** What the pointer leaves when released at `point`. */
export function endGesture(gesture: Gesture, point: Point, geometry: MapGeometry): GestureEnd {
  if (gesture.kind === 'drawing') {
    // Measured where the press really landed, not at its clamped anchor: a stationary
    // press on an axis label must not read as a drag into the plot.
    const travel = Math.hypot(point.x - gesture.rawOrigin.x, point.y - gesture.rawOrigin.y);
    if (travel < LAYOUT.dragThresholdPx) {
      return geometry.isInPlot(gesture.rawOrigin)
        ? { type: 'click', cell: cellAt(gesture.origin, geometry) }
        : { type: 'none' };
    }
  }
  if (
    gesture.kind === 'moving' &&
    Math.hypot(point.x - gesture.origin.x, point.y - gesture.origin.y) < LAYOUT.dragThresholdPx
  ) {
    return { type: 'click', cell: cellAt(gesture.origin, geometry) };
  }
  return { type: 'range', range: moveGesture(gesture, point, geometry) };
}
