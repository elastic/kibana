/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * A region as whole cells: `x0` and `y0` are the edges of its first column and row, `x1` and
 * `y1` the edges after its last. Selections are built from these, so they never cut a cell.
 */
export interface CellRange {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

export interface Cell {
  xi: number;
  yi: number;
}

/** Corner and middle handles. `t` is the top of the map, the slow end. */
export type HandleId = 'tl' | 'tr' | 'bl' | 'br' | 't' | 'b' | 'l' | 'r';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** The range of the cells between two cells, both included. */
export const rangeFromCells = (a: Cell, b: Cell): CellRange => ({
  x0: Math.min(a.xi, b.xi),
  x1: Math.max(a.xi, b.xi) + 1,
  y0: Math.min(a.yi, b.yi),
  y1: Math.max(a.yi, b.yi) + 1,
});

/** Shifts a range by whole cells, keeping it inside the grid. */
export function moveRange(
  range: CellRange,
  dCols: number,
  dRows: number,
  bins: number,
  rows: number
): CellRange {
  const width = range.x1 - range.x0;
  const height = range.y1 - range.y0;
  const x0 = clamp(range.x0 + dCols, 0, bins - width);
  const y0 = clamp(range.y0 + dRows, 0, rows - height);
  return { x0, x1: x0 + width, y0, y1: y0 + height };
}

/** Keeps `start < end`, a cell wide at least, inside `0..limit`. */
function normalizeEdges(a: number, b: number, limit: number): [number, number] {
  let start = clamp(Math.min(a, b), 0, limit);
  let end = clamp(Math.max(a, b), 0, limit);
  if (start === end) {
    if (end < limit) end += 1;
    else start -= 1;
  }
  return [start, end];
}

/** Drags a handle to an edge of the grid. A range never collapses below a cell. */
export function resizeRange(
  range: CellRange,
  handle: HandleId,
  edge: { x: number; y: number },
  bins: number,
  rows: number
): CellRange {
  const next = { ...range };
  if (handle.includes('l')) next.x0 = edge.x;
  if (handle.includes('r')) next.x1 = edge.x;
  if (handle.includes('b')) next.y0 = edge.y;
  if (handle.includes('t')) next.y1 = edge.y;
  const [x0, x1] = normalizeEdges(next.x0, next.x1, bins);
  const [y0, y1] = normalizeEdges(next.y0, next.y1, rows);
  return { x0, x1, y0, y1 };
}

/** Grows or shrinks a range from its far corner by a whole cell, as arrow keys do. */
export function extendRange(
  range: CellRange,
  dCols: number,
  dRows: number,
  bins: number,
  rows: number
): CellRange {
  const [x0, x1] = normalizeEdges(range.x0, range.x1 + dCols, bins);
  const [y0, y1] = normalizeEdges(range.y0, range.y1 + dRows, rows);
  return { x0, x1, y0, y1 };
}

export const isSameRange = (a: CellRange, b: CellRange) =>
  a.x0 === b.x0 && a.x1 === b.x1 && a.y0 === b.y0 && a.y1 === b.y1;
