/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getTimeGrid, timeToEdge } from './time_grid';

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

  describe('timeToEdge', () => {
    it('is the plain position among the columns, while the columns are inside the range', () => {
      const grid = getTimeGrid(from, to, 60);
      expect(timeToEdge(grid, grid.fromMs)).toBe(0);
      expect(timeToEdge(grid, grid.fromMs + 90_000)).toBe(1.5);
      expect(timeToEdge(grid, grid.endMs)).toBe(60);
    });

    it('takes the end of the range as the final edge when the last column reaches past it', () => {
      // One second in 85 columns of 12 ms: 84 columns, the last with 4 ms of range in its 12.
      const grid = getTimeGrid('2026-10-26T10:00:00.000Z', '2026-10-26T10:00:01.000Z', 85);
      expect(grid.binMs).toBe(12);
      expect(grid.bins).toBe(84);
      expect(grid.bins * grid.binMs).toBeGreaterThan(grid.endMs - grid.fromMs);
      expect(timeToEdge(grid, grid.endMs)).toBe(84);
      // The start of the last column, and the middle of what it has.
      expect(timeToEdge(grid, grid.fromMs + 83 * 12)).toBe(83);
      expect(timeToEdge(grid, grid.fromMs + 83 * 12 + 2)).toBeCloseTo(83.5);
    });

    it('does not go past the final edge for a time beyond the range', () => {
      const grid = getTimeGrid('2026-10-26T10:00:00.000Z', '2026-10-26T10:00:01.000Z', 85);
      expect(timeToEdge(grid, grid.endMs + 500)).toBe(84);
    });

    it('is continuous where the last column begins', () => {
      const grid = getTimeGrid('2026-10-26T10:00:00.000Z', '2026-10-26T10:00:01.000Z', 85);
      const start = grid.fromMs + 83 * 12;
      expect(timeToEdge(grid, start - 1)).toBeCloseTo(83 - 1 / 12, 5);
      expect(timeToEdge(grid, start)).toBe(83);
    });
  });
});
