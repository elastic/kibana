/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getTimeGrid } from '../query/time_grid';
import { brushToRange, rangeToHighlight } from './brush';

const timeGrid = getTimeGrid('2026-10-26T10:00:00.000Z', '2026-10-26T11:00:00.000Z', 60);
const at = (column: number) => timeGrid.fromMs + column * timeGrid.binMs;

describe('brushToRange', () => {
  it('reads the columns from the time span, which ends after the last one, and the rows', () => {
    expect(brushToRange([at(3), at(7)], [2, 3, 4, 5], timeGrid, 24)).toEqual({
      x0: 3,
      x1: 7,
      y0: 2,
      y1: 6,
    });
  });

  it('is a cell wide at least', () => {
    expect(brushToRange([at(3), at(3)], [4], timeGrid, 24)).toEqual({ x0: 3, x1: 4, y0: 4, y1: 5 });
    expect(brushToRange([at(3)], [4], timeGrid, 24)).toEqual({ x0: 3, x1: 4, y0: 4, y1: 5 });
  });

  it('stays inside the grid', () => {
    expect(brushToRange([at(-5), at(999)], [-3, 99], timeGrid, 24)).toEqual({
      x0: 0,
      x1: 60,
      y0: 0,
      y1: 24,
    });
  });

  it('reads numbers given as text, and nothing from nothing', () => {
    expect(brushToRange([`${at(1)}`, `${at(2)}`], ['0', '1'], timeGrid, 24)).toEqual({
      x0: 1,
      x1: 2,
      y0: 0,
      y1: 2,
    });
    expect(brushToRange([], [1], timeGrid, 24)).toBeUndefined();
    expect(brushToRange([at(1)], [], timeGrid, 24)).toBeUndefined();
  });
});

describe('rangeToHighlight', () => {
  it('gives the span and the rows from the top, so that the chart draws it where the rows are', () => {
    const range = { x0: 3, x1: 7, y0: 2, y1: 6 };
    expect(rangeToHighlight(range, timeGrid)).toEqual({ x: [at(3), at(7)], y: [5, 4, 3, 2] });
  });

  it('round-trips with the brush', () => {
    const range = { x0: 10, x1: 30, y0: 0, y1: 24 };
    const { x, y } = rangeToHighlight(range, timeGrid);
    expect(brushToRange(x, y, timeGrid, 24)).toEqual(range);
  });
});
