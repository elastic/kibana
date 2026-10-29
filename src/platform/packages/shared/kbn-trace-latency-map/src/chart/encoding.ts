/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ColorBand } from '@elastic/charts';
import { LATENCY_MAP_ROWS } from '../query/duration_rows';
import type { LatencyGrid } from '../query/parse';
import type { TimeGrid } from '../query/time_grid';

/** Steps of opacity: how many spans a cell holds, from few to the fullest cell. */
export const DENSITY_LEVELS = 8;
/** Steps of hue: how many of the spans failed, from none to nearly all. */
export const FAILURE_LEVELS = 5;

/**
 * A heatmap has one colour scale, and the map shows two things in a cell: how many spans and how
 * many failed. So a cell carries one number, `failureLevel * 100 + densityLevel`, and a band of
 * that number carries the colour of both. 0 is a cell without spans, which is transparent.
 */
const FAILURE_STEP = 100;

export interface HeatmapDatum {
  /** Start of the cell's time column, in ms. */
  x: number;
  /** The duration row, 0 for the fastest. */
  y: number;
  /** The encoded colour value. */
  value: number;
  spans: number;
  failed: number;
}

export function getDensityLevel(spans: number, maxSpans: number) {
  if (spans <= 0) return 0;
  // Logarithmic, so the many cells of a busy mode do not drown the rare ones.
  const level = Math.log(1 + spans) / Math.log(1 + Math.max(1, maxSpans));
  return Math.min(DENSITY_LEVELS, Math.max(1, Math.ceil(level * DENSITY_LEVELS)));
}

export function getFailureLevel(failed: number, spans: number) {
  if (failed <= 0 || spans <= 0) return 0;
  const rate = failed / spans;
  return Math.min(FAILURE_LEVELS - 1, 1 + Math.floor(rate * (FAILURE_LEVELS - 1)));
}

export const encodeCell = (spans: number, failed: number, maxSpans: number) =>
  spans > 0 ? getFailureLevel(failed, spans) * FAILURE_STEP + getDensityLevel(spans, maxSpans) : 0;

/**
 * The cells of the map as heatmap data. Rows are categories, so a row without spans would not
 * exist on the chart: every row, and the first and last time columns, get a transparent cell.
 * Otherwise a sparse map would lose rows and stretch its time axis.
 *
 * With `failedOnly` a cell is its failed spans alone.
 */
export function buildHeatmapData(
  grid: LatencyGrid,
  timeGrid: TimeGrid,
  failedOnly: boolean
): HeatmapDatum[] {
  const { fromMs, binMs, bins } = timeGrid;
  // A cell of the failed spans alone: all of its spans failed.
  const cells = [...grid.cells.values()].map((cell) =>
    failedOnly ? { ...cell, spans: cell.failed } : cell
  );
  const maxSpans = Math.max(1, ...cells.map((cell) => cell.spans));
  const data: HeatmapDatum[] = [];
  const present = new Set<number>();
  for (const cell of cells) {
    if (cell.spans <= 0) continue;
    present.add(cell.yi * bins + cell.xi);
    data.push({
      x: fromMs + cell.xi * binMs,
      y: cell.yi,
      value: encodeCell(cell.spans, cell.failed, maxSpans),
      spans: cell.spans,
      failed: cell.failed,
    });
  }
  for (let yi = 0; yi < LATENCY_MAP_ROWS; yi++) {
    for (const xi of [0, bins - 1]) {
      if (present.has(yi * bins + xi)) continue;
      data.push({ x: fromMs + xi * binMs, y: yi, value: 0, spans: 0, failed: 0 });
    }
  }
  return data;
}

/** One band per encoded value, painted by `colorFor`; the band of 0 is transparent. */
export function buildColorBands(
  colorFor: (densityLevel: number, failureLevel: number) => string
): ColorBand[] {
  const bands: ColorBand[] = [{ start: 0, end: 1, color: 'rgba(0,0,0,0)' }];
  for (let failureLevel = 0; failureLevel < FAILURE_LEVELS; failureLevel++) {
    for (let density = 1; density <= DENSITY_LEVELS; density++) {
      const start = failureLevel * FAILURE_STEP + density;
      bands.push({
        start,
        end: start + 1,
        color: colorFor(density, failureLevel),
      });
    }
  }
  return bands;
}
