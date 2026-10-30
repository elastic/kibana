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
 * The numbers of time columns a map has, so that resizing it within a tier stretches the cells it
 * has instead of loading the data again. The last is the most the grid query returns in full.
 */
const TIME_BIN_TIERS = [LAYOUT.minTimeBins, 60, 80, 120, 160, 240, 320, MAX_TIME_BINS];

/**
 * Time columns for a map of this width: the largest tier that gives cells no narrower than
 * `LAYOUT.cellWidth`, so that a resize loads again only when it crosses into another tier.
 */
export const getTimeBinsForWidth = (width: number) => {
  const plotWidth = Math.max(width, LAYOUT.minWidth) - LAYOUT.plotInset.horizontal;
  const fitting = TIME_BIN_TIERS.filter((tier) => tier * LAYOUT.cellWidth <= plotWidth);
  return fitting.length ? Math.max(...fitting) : LAYOUT.minTimeBins;
};
