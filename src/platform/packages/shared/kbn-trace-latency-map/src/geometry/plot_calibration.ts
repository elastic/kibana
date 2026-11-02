/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LAYOUT } from './layout';
import type { PlotArea } from './map_geometry';

/** A cell of the chart as it reports it: its pixels on the grid, and where it is in the grid. */
export interface ChartCell {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Index of the cell's row, counted from the top of the plot. */
  yIndex: number;
}

/**
 * Where the chart's grid starts in the chart: right of the duration labels, below a small margin
 * and half the gap, which the chart adds above the grid. The theme pins the chart's margins and
 * paddings to these (see `LatencyHeatmap`).
 */
export const GRID_ORIGIN = {
  left: LAYOUT.yAxisLabelWidth,
  top: LAYOUT.plotTopMargin + LAYOUT.cellGap / 2,
};

/**
 * The plot of the chart, from one cell it reports. A cell's pixels are relative to the grid, and
 * cells are laid out evenly, so one cell and its place in the grid give the size of every cell and
 * the grid's own corner. This keeps us from working out the chart's layout, which depends on how
 * wide its labels measure, and from breaking when it changes.
 *
 * A cell is a gap smaller than its place in the grid, and sits half a gap in from the corner of it.
 */
export function calibratePlot(cell: ChartCell, columnIndex: number): PlotArea {
  const gap = LAYOUT.cellGap;
  const colWidth = cell.width + gap;
  const rowHeight = cell.height + gap;
  return {
    left: GRID_ORIGIN.left + (cell.x - gap / 2) - columnIndex * colWidth,
    top: GRID_ORIGIN.top + (cell.y - gap / 2) - cell.yIndex * rowHeight,
    colWidth,
    rowHeight,
  };
}

export const isSamePlot = (a: PlotArea, b: PlotArea) =>
  Math.abs(a.left - b.left) < 0.5 &&
  Math.abs(a.top - b.top) < 0.5 &&
  Math.abs(a.colWidth - b.colWidth) < 0.01 &&
  Math.abs(a.rowHeight - b.rowHeight) < 0.01;
