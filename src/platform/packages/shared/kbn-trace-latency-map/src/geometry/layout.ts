/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MAX_TIME_BINS } from '../query/duration_rows';

/** Layout of the map, in pixels. */
export const LAYOUT = {
  /** Height of the whole chart, axes included, when the host gives none. */
  defaultHeight: 200,
  /** Width the chart gives the duration labels. Fixed, so the plot does not shift with them. */
  yAxisLabelWidth: 64,
  /** Space between cells, in pixels: the chart's grid line, left transparent. */
  cellGap: 1,
  /** Space above the plot, so that the label of the top row is not cut by the chart's edge. */
  plotTopMargin: 8,
  /** Room the chart keeps beside and around the plot for the axes, to count columns and rows. */
  plotInset: { horizontal: 72, vertical: 36 },
  /** Target cell width; the number of time columns follows the plot width. */
  cellWidth: 9,
  minTimeBins: 40,
  minWidth: 320,
  handleSize: 8,
  handleHitRadius: 7,
  /** Smallest drag that moves or resizes the selection rather than clicking a cell. */
  dragThresholdPx: 4,
};

/**
 * Time columns for a map of this width, in multiples of 5 so that a small resize does not
 * reload the map. Never more than the grid query can return, however wide the map is.
 */
export const getTimeBinsForWidth = (width: number) => {
  const plotWidth = Math.max(width, LAYOUT.minWidth) - LAYOUT.plotInset.horizontal;
  const bins = Math.max(
    LAYOUT.minTimeBins,
    Math.round(Math.floor(plotWidth / LAYOUT.cellWidth) / 5) * 5
  );
  return Math.min(bins, MAX_TIME_BINS);
};
