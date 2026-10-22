/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { colorPalette } from '@elastic/eui';
import type { LensHeatmapConfig } from '@kbn/lens-embeddable-utils';
import { LENS_HEATMAP_DEFAULT_COLOR_STEPS } from '@kbn/lens-common';
import {
  HISTOGRAM_BUCKET_COLUMN,
  HISTOGRAM_COUNT_COLUMN,
  createTimeBucketAggregation,
} from '../../common/utils';

/** Builds a histogram heatmap with the same Lens config builder the XY charts use. */
export const buildHistogramHeatmapConfig = ({
  query,
  title,
  description,
  seriesColor,
  backgroundColor,
}: {
  query: string;
  title: string;
  description?: string;
  seriesColor: string;
  backgroundColor: string;
}): LensHeatmapConfig => ({
  chartType: 'heatmap',
  title,
  description,
  dataset: { esql: query },
  value: HISTOGRAM_COUNT_COLUMN,
  xAxis: createTimeBucketAggregation({}),
  breakdown: HISTOGRAM_BUCKET_COLUMN,
  legend: { show: false },
  axisLabel: { xAxis: true, yAxis: true },
  palette: {
    // The first stop is the panel background. Dropping it keeps the lowest band a visible tint.
    colors: colorPalette(
      [backgroundColor, seriesColor],
      LENS_HEATMAP_DEFAULT_COLOR_STEPS + 1
    ).slice(1),
  },
});
