/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getTimeGrid } from './time_grid';

describe('getTimeGrid', () => {
  const from = '2026-10-26T10:00:00.000Z';
  const to = '2026-10-26T11:00:00.000Z';

  it('has a whole number of milliseconds a column, so that a column edge is an exact timestamp', () => {
    expect(getTimeGrid(from, to, 60)).toEqual({
      fromMs: Date.parse(from),
      binMs: 60_000,
      bins: 60,
      endMs: Date.parse(to),
    });
    expect(Number.isInteger(getTimeGrid(from, to, 70).binMs)).toBe(true);
  });

  it('covers the range, and may reach past it by less than a column', () => {
    const grid = getTimeGrid(from, to, 70);
    const reach = grid.bins * grid.binMs - (grid.endMs - grid.fromMs);
    expect(reach).toBeGreaterThanOrEqual(0);
    expect(reach).toBeLessThan(grid.binMs);
  });

  it('keeps the real end of the range, whatever the columns reach', () => {
    expect(getTimeGrid(from, to, 70).endMs).toBe(Date.parse(to));
  });

  it('survives a range of nothing', () => {
    const grid = getTimeGrid(from, from, 60);
    expect(grid.bins).toBe(1);
    expect(grid.endMs).toBe(Date.parse(from) + 1);
  });
});
