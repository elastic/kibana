/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { extendRange, moveRange, rangeFromCells, resizeRange } from './cell_range';

describe('cell ranges', () => {
  const range = { x0: 2, x1: 5, y0: 3, y1: 6 };

  it('covers the cells between two cells, both included', () => {
    expect(rangeFromCells({ xi: 4, yi: 1 }, { xi: 2, yi: 3 })).toEqual({
      x0: 2,
      x1: 5,
      y0: 1,
      y1: 4,
    });
    expect(rangeFromCells({ xi: 1, yi: 1 }, { xi: 1, yi: 1 })).toEqual({
      x0: 1,
      x1: 2,
      y0: 1,
      y1: 2,
    });
  });

  it('moves by whole cells and stops at the edges of the grid', () => {
    expect(moveRange(range, 2, -1, 10, 8)).toEqual({ x0: 4, x1: 7, y0: 2, y1: 5 });
    expect(moveRange(range, 99, 99, 10, 8)).toEqual({ x0: 7, x1: 10, y0: 5, y1: 8 });
    expect(moveRange(range, -99, -99, 10, 8)).toEqual({ x0: 0, x1: 3, y0: 0, y1: 3 });
  });

  it('resizes from a handle', () => {
    expect(resizeRange(range, 'br', { x: 8, y: 1 }, 10, 8)).toEqual({ x0: 2, x1: 8, y0: 1, y1: 6 });
    expect(resizeRange(range, 't', { x: 0, y: 7 }, 10, 8)).toEqual({ x0: 2, x1: 5, y0: 3, y1: 7 });
  });

  it('flips when a handle crosses the opposite edge', () => {
    expect(resizeRange(range, 'l', { x: 8, y: 0 }, 10, 8)).toEqual({ x0: 5, x1: 8, y0: 3, y1: 6 });
  });

  it('never collapses below a cell, not even at the edge of the grid', () => {
    expect(resizeRange(range, 'r', { x: 2, y: 0 }, 10, 8)).toEqual({ x0: 2, x1: 3, y0: 3, y1: 6 });
    expect(resizeRange({ x0: 8, x1: 10, y0: 0, y1: 1 }, 'r', { x: 10, y: 0 }, 10, 8).x1).toBe(10);
    expect(resizeRange({ x0: 8, x1: 10, y0: 0, y1: 1 }, 'l', { x: 10, y: 0 }, 10, 8)).toEqual({
      x0: 9,
      x1: 10,
      y0: 0,
      y1: 1,
    });
  });

  it('extends from the far corner by a cell, one cell at least', () => {
    expect(extendRange(range, 1, 1, 10, 8)).toEqual({ x0: 2, x1: 6, y0: 3, y1: 7 });
    expect(extendRange({ x0: 2, x1: 3, y0: 3, y1: 4 }, -1, -1, 10, 8)).toEqual({
      x0: 2,
      x1: 3,
      y0: 3,
      y1: 4,
    });
  });
});
