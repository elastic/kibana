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
import type { LatencyGrid } from '../query/parse';
import {
  DENSITY_LEVELS,
  FAILURE_LEVELS,
  buildColorBands,
  buildHeatmapData,
  encodeCell,
  getDensityLevel,
  getFailureLevel,
} from './encoding';

const timeGrid = getTimeGrid('2026-10-26T10:00:00.000Z', '2026-10-26T11:00:00.000Z', 60);

const gridOf = (cells: Array<[number, number, number, number]>): LatencyGrid => ({
  bins: timeGrid.bins,
  maxSpans: Math.max(0, ...cells.map(([, , spans]) => spans)),
  cells: new Map(
    cells.map(([xi, yi, spans, failed]) => [yi * timeGrid.bins + xi, { xi, yi, spans, failed }])
  ),
});

describe('cell encoding', () => {
  it('gives an empty cell 0 and every other cell a level of at least 1', () => {
    expect(getDensityLevel(0, 100)).toBe(0);
    expect(getDensityLevel(1, 1_000_000)).toBe(1);
    expect(getDensityLevel(100, 100)).toBe(DENSITY_LEVELS);
  });

  it('raises the density level with the log of the spans', () => {
    const levels = [1, 10, 100, 1000].map((spans) => getDensityLevel(spans, 1000));
    expect(levels).toEqual([...levels].sort((a, b) => a - b));
    expect(new Set(levels).size).toBe(4);
  });

  it('puts no failure at level 0, and a single failure above it', () => {
    expect(getFailureLevel(0, 10)).toBe(0);
    expect(getFailureLevel(1, 10_000)).toBe(1);
    expect(getFailureLevel(10, 10)).toBe(FAILURE_LEVELS - 1);
  });

  it('keeps density and failure apart in one number', () => {
    expect(encodeCell(0, 0, 100)).toBe(0);
    expect(encodeCell(100, 0, 100)).toBe(DENSITY_LEVELS);
    expect(encodeCell(100, 100, 100)).toBe((FAILURE_LEVELS - 1) * 100 + DENSITY_LEVELS);
  });
});

describe('buildHeatmapData', () => {
  const grid = gridOf([
    [3, 5, 40, 10],
    [4, 5, 20, 0],
  ]);

  it('has a datum per cell, at its time and row, with its counts', () => {
    const cell = buildHeatmapData(grid, timeGrid, false).find((datum) => datum.spans === 40);
    expect(cell).toMatchObject({
      x: timeGrid.fromMs + 3 * timeGrid.binMs,
      y: 5,
      spans: 40,
      failed: 10,
    });
    expect(cell!.value).toBe(encodeCell(40, 10, 40));
  });

  it('adds transparent cells so that every row and the whole time axis exist', () => {
    const data = buildHeatmapData(grid, timeGrid, false);
    const filler = data.filter((datum) => datum.value === 0);
    expect(new Set(data.map((datum) => datum.y)).size).toBe(LATENCY_MAP_ROWS);
    expect(Math.min(...data.map((datum) => datum.x))).toBe(timeGrid.fromMs);
    expect(Math.max(...data.map((datum) => datum.x))).toBe(
      timeGrid.fromMs + (timeGrid.bins - 1) * timeGrid.binMs
    );
    expect(filler.every((datum) => datum.spans === 0)).toBe(true);
    // Two columns by every row, minus nothing a real cell covers there.
    expect(filler).toHaveLength(2 * LATENCY_MAP_ROWS);
  });

  it('does not add a filler where a real cell is', () => {
    const edge = gridOf([[0, 0, 5, 0]]);
    const data = buildHeatmapData(edge, timeGrid, false);
    expect(data.filter((datum) => datum.x === timeGrid.fromMs && datum.y === 0)).toHaveLength(1);
  });

  it('keeps the failed spans only, painted with the full hue, when asked', () => {
    const data = buildHeatmapData(grid, timeGrid, true);
    const real = data.filter((datum) => datum.spans > 0);
    expect(real).toHaveLength(1);
    expect(real[0]).toMatchObject({ spans: 10, failed: 10 });
    expect(real[0].value).toBe(encodeCell(10, 10, 10));
  });
});

describe('buildColorBands', () => {
  it('has a band for every encoded value and a transparent one for 0', () => {
    const bands = buildColorBands((density, failureLevel) => `${density}/${failureLevel}`);
    expect(bands).toHaveLength(1 + DENSITY_LEVELS * FAILURE_LEVELS);
    expect(bands[0]).toEqual({ start: 0, end: 1, color: 'rgba(0,0,0,0)' });
    const value = encodeCell(100, 100, 100);
    expect(bands.find((band) => band.start === value)?.color).toBe(
      `${DENSITY_LEVELS}/${FAILURE_LEVELS - 1}`
    );
  });
});
