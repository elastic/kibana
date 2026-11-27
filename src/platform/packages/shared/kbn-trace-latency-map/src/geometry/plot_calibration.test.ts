/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LATENCY_MAP_ROWS } from '../query/duration_rows';
import { LAYOUT } from './layout';
import { GRID_ORIGIN, calibratePlot, estimatePlot, isSamePlot } from './plot_calibration';

/** A cell as the chart reports it: a gap smaller than its place on the grid, half a gap in. */
const cellAt = (column: number, row: number, pitchX = 9.6, pitchY = 10) => ({
  x: column * pitchX + LAYOUT.cellGap / 2,
  y: row * pitchY + LAYOUT.cellGap / 2,
  width: pitchX - LAYOUT.cellGap,
  height: pitchY - LAYOUT.cellGap,
  yIndex: row,
});

describe('calibratePlot', () => {
  it('finds the plot from one cell, its pixels on the grid and its place in it', () => {
    const plot = calibratePlot(cellAt(7, 3), 7);
    // The grid starts right of the duration labels, below the margin.
    expect(plot.left).toBeCloseTo(GRID_ORIGIN.left);
    expect(plot.top).toBeCloseTo(GRID_ORIGIN.top);
  });

  it('takes the gap between cells as part of the cell, so that the plot has the cells of the grid', () => {
    const plot = calibratePlot(cellAt(7, 3), 7);
    expect(plot.colWidth).toBeCloseTo(9.6);
    expect(plot.rowHeight).toBeCloseTo(10);
  });

  it('gives the same plot from any cell', () => {
    expect(isSamePlot(calibratePlot(cellAt(0, 0), 0), calibratePlot(cellAt(40, 17), 40))).toBe(
      true
    );
  });

  it('tells a plot that moved from one that did not', () => {
    const plot = { left: 64, top: 14, colWidth: 9.6, rowHeight: 10 };
    expect(isSamePlot(plot, { ...plot, left: 64.2 })).toBe(true);
    expect(isSamePlot(plot, { ...plot, left: 70 })).toBe(false);
    expect(isSamePlot(plot, { ...plot, colWidth: 9.7 })).toBe(false);
  });
});

describe('estimatePlot', () => {
  const chart = { width: 600, height: 200, rightMargin: LAYOUT.bandLabelsWidth, bins: 40 };

  it('starts the plot at the grid origin', () => {
    const plot = estimatePlot(chart);
    expect(plot.left).toBe(GRID_ORIGIN.left);
    expect(plot.top).toBe(GRID_ORIGIN.top);
  });

  it('ends the columns half a gap short of the right margin', () => {
    const plot = estimatePlot(chart);
    expect(plot.left + chart.bins * plot.colWidth).toBeCloseTo(
      chart.width - chart.rightMargin - LAYOUT.cellGap / 2
    );
  });

  it('ends the rows where the time labels start', () => {
    const plot = estimatePlot(chart);
    expect(plot.top + LATENCY_MAP_ROWS * plot.rowHeight).toBeCloseTo(
      chart.height - LAYOUT.xAxisHeight
    );
  });

  it('gives a chart too small for a plot cells of no size, not of a negative one', () => {
    const plot = estimatePlot({ ...chart, width: 0, height: 0 });
    expect(plot.colWidth).toBe(0);
    expect(plot.rowHeight).toBe(0);
  });
});
