/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DurationStats, LatencyMapSelection } from '../types';
import { LATENCY_MAP_ROWS, durationUsToRow, rowToDurationUs } from '../query/duration_rows';
import type { TimeGrid } from '../query/time_grid';
import type { Cell, CellRange, HandleId } from './cell_range';
import { LAYOUT } from './layout';

export interface Point {
  x: number;
  y: number;
}

/** A rectangle in pixels, with x0 < x1 and y0 < y1. */
export interface PxRect {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/**
 * Where the chart put its cells, in pixels of the chart: the top left corner of the plot and the
 * size of a cell. The chart decides these (axis labels, padding), see `calibratePlot`.
 */
export interface PlotArea {
  left: number;
  top: number;
  colWidth: number;
  rowHeight: number;
}

export interface Handle extends Point {
  id: HandleId;
  cursor: string;
}

export interface MapGeometry {
  bins: number;
  rows: number;
  plotLeft: number;
  plotRight: number;
  plotTop: number;
  plotBottom: number;
  colWidth: number;
  rowHeight: number;
  /** Pixel x of a column edge, `0..bins`. */
  edgeToX: (edge: number) => number;
  /** Pixel y of a row edge, `0..rows`; the bottom of the plot is 0. */
  edgeToY: (edge: number) => number;
  /** The grid cell under a point, if it is inside the plot. */
  pointToCell: (point: Point) => Cell | undefined;
  /** The nearest column and row edges of a point, as a drag handle snaps. */
  pointToEdge: (point: Point) => { x: number; y: number };
  isInPlot: (point: Point) => boolean;
  clampToPlot: (point: Point) => Point;
  rangeToRect: (range: CellRange) => PxRect;
  /** The selection of a range of cells, with the exact bounds of its cells. */
  rangeToSelection: (range: CellRange, failedOnly?: boolean) => LatencyMapSelection;
  /** The cells nearest to a selection's bounds, at least one. */
  selectionToRange: (selection: LatencyMapSelection) => CellRange;
  /** The handles of a rectangle, with the cursor that suits each. */
  getHandles: (rect: PxRect) => Handle[];
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function createMapGeometry({
  plot,
  timeGrid,
  stats,
}: {
  plot: PlotArea;
  timeGrid: TimeGrid;
  stats: DurationStats;
}): MapGeometry {
  const { bins, fromMs, binMs } = timeGrid;
  const rows = LATENCY_MAP_ROWS;
  const { left: plotLeft, top: plotTop, colWidth, rowHeight } = plot;
  const plotRight = plotLeft + bins * colWidth;
  const plotBottom = plotTop + rows * rowHeight;

  const edgeToX = (edge: number) => plotLeft + edge * colWidth;
  const edgeToY = (edge: number) => plotBottom - edge * rowHeight;
  const timeToEdge = (timestampMs: number) => (timestampMs - fromMs) / binMs;
  const durationToEdge = (durationUs: number) => clamp(durationUsToRow(durationUs, stats), 0, rows);
  const isInPlot = ({ x, y }: Point) =>
    x >= plotLeft && x <= plotRight && y >= plotTop && y <= plotBottom;

  return {
    bins,
    rows,
    plotLeft,
    plotRight,
    plotTop,
    plotBottom,
    colWidth,
    rowHeight,
    edgeToX,
    edgeToY,
    pointToCell: (point) =>
      isInPlot(point)
        ? {
            xi: clamp(Math.floor((point.x - plotLeft) / colWidth), 0, bins - 1),
            yi: clamp(Math.floor((plotBottom - point.y) / rowHeight), 0, rows - 1),
          }
        : undefined,
    pointToEdge: (point) => ({
      x: clamp(Math.round((point.x - plotLeft) / colWidth), 0, bins),
      y: clamp(Math.round((plotBottom - point.y) / rowHeight), 0, rows),
    }),
    isInPlot,
    clampToPlot: ({ x, y }) => ({
      x: clamp(x, plotLeft, plotRight),
      y: clamp(y, plotTop, plotBottom),
    }),
    rangeToRect: (range) => ({
      x0: edgeToX(range.x0),
      x1: edgeToX(range.x1),
      y0: edgeToY(range.y1),
      y1: edgeToY(range.y0),
    }),
    rangeToSelection: (range, failedOnly) => ({
      from: new Date(fromMs + range.x0 * binMs).toISOString(),
      to: new Date(fromMs + range.x1 * binMs).toISOString(),
      // The bottom row reads everything below it too, as the query puts the fastest spans in it.
      minDurationUs: range.y0 <= 0 ? 0 : rowToDurationUs(range.y0, stats),
      maxDurationUs: rowToDurationUs(range.y1, stats),
      ...(failedOnly ? { failedOnly } : {}),
    }),
    selectionToRange: (selection) => {
      const xa = clamp(Math.round(timeToEdge(Date.parse(selection.from))), 0, bins);
      const xb = clamp(Math.round(timeToEdge(Date.parse(selection.to))), 0, bins);
      const ya = Math.round(durationToEdge(selection.minDurationUs));
      const yb = Math.round(durationToEdge(selection.maxDurationUs));
      const x0 = Math.min(xa, xb, bins - 1);
      const y0 = Math.min(ya, yb, rows - 1);
      return {
        x0,
        x1: Math.max(x0 + 1, xa, xb),
        y0,
        y1: Math.max(y0 + 1, ya, yb),
      };
    },
    getHandles: (rect) => {
      const midX = (rect.x0 + rect.x1) / 2;
      const midY = (rect.y0 + rect.y1) / 2;
      return [
        { id: 'tl', x: rect.x0, y: rect.y0, cursor: 'nwse-resize' },
        { id: 'tr', x: rect.x1, y: rect.y0, cursor: 'nesw-resize' },
        { id: 'bl', x: rect.x0, y: rect.y1, cursor: 'nesw-resize' },
        { id: 'br', x: rect.x1, y: rect.y1, cursor: 'nwse-resize' },
        { id: 't', x: midX, y: rect.y0, cursor: 'ns-resize' },
        { id: 'b', x: midX, y: rect.y1, cursor: 'ns-resize' },
        { id: 'l', x: rect.x0, y: midY, cursor: 'ew-resize' },
        { id: 'r', x: rect.x1, y: midY, cursor: 'ew-resize' },
      ];
    },
  };
}

/**
 * The handle under a point, if any. The reach of a handle shrinks with the selection, so that a
 * small one keeps a middle to grab and move it by.
 */
export const findHandle = (point: Point, handles: Handle[], rect: PxRect): HandleId | undefined => {
  const radius = Math.min(
    LAYOUT.handleHitRadius,
    Math.min(rect.x1 - rect.x0, rect.y1 - rect.y0) / 3
  );
  return handles.find(
    (handle) => Math.abs(point.x - handle.x) <= radius && Math.abs(point.y - handle.y) <= radius
  )?.id;
};

export const isInsideRect = (point: Point, rect: PxRect) =>
  point.x > rect.x0 && point.x < rect.x1 && point.y > rect.y0 && point.y < rect.y1;
