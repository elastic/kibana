/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LensHeatmapConfig } from '@kbn/lens-embeddable-utils';
import {
  HISTOGRAM_BUCKET_COLUMN,
  HISTOGRAM_COUNT_COLUMN,
  createTimeBucketAggregation,
} from '../../common/utils';

/** Builds a histogram heatmap with the same Lens config builder the XY charts use. */
export const buildHistogramHeatmapConfig = ({
  query,
  title,
}: {
  query: string;
  title: string;
}): LensHeatmapConfig => ({
  chartType: 'heatmap',
  title,
  dataset: { esql: query },
  value: HISTOGRAM_COUNT_COLUMN,
  xAxis: createTimeBucketAggregation({}),
  breakdown: HISTOGRAM_BUCKET_COLUMN,
  legend: { show: false },
  axisLabel: { xAxis: true, yAxis: true },
});
