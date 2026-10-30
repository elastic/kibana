/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { addTableToGrid, createEmptyGrid, getCellKey } from './parse';

const table = (values: number[][]) => ({
  columns: ['xi', 'yi', 'spans', 'failed'].map((name) => ({ name })),
  values,
});

describe('addTableToGrid', () => {
  it('reads a cell per row and tracks the fullest', () => {
    const grid = addTableToGrid(
      createEmptyGrid(10),
      table([
        [1, 2, 5, 1],
        [3, 4, 9, 0],
      ])
    );
    expect(grid.cells.get(getCellKey(1, 2, 10))).toEqual({ xi: 1, yi: 2, spans: 5, failed: 1 });
    expect(grid.maxSpans).toBe(9);
  });

  it('adds the sampled part of a range, scaled, to its exact part', () => {
    const exact = addTableToGrid(createEmptyGrid(10), table([[1, 2, 3, 3]]));
    const grid = addTableToGrid(
      exact,
      table([
        [1, 2, 10, 0],
        [5, 5, 4, 1],
      ]),
      4
    );
    expect(grid.cells.get(getCellKey(1, 2, 10))).toEqual({ xi: 1, yi: 2, spans: 43, failed: 3 });
    expect(grid.cells.get(getCellKey(5, 5, 10))).toEqual({ xi: 5, yi: 5, spans: 16, failed: 4 });
    expect(grid.maxSpans).toBe(43);
  });

  it('ignores cells outside the grid', () => {
    const grid = addTableToGrid(
      createEmptyGrid(10),
      table([
        [10, 0, 1, 0],
        [-1, 0, 1, 0],
        [0, 99, 1, 0],
      ])
    );
    expect(grid.cells.size).toBe(0);
  });
});
