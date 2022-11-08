/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { DataPublicPluginStart, search, tabifyAggResponse } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { UnifiedHistogramBucketInterval } from '../types';
import { buildPointSeriesData } from './build_point_series_data';
import { getChartAggConfigs } from './get_chart_agg_configs';
import { getDimensions } from './get_dimensions';

/**
 * Convert the response from the chart request into a format that can be used
 * by the unified histogram chart. The returned object should be used to update
 * {@link UnifiedHistogramChartContext.bucketInterval} and {@link UnifiedHistogramChartContext.data}.
 */
export const buildChartData = ({
  data,
  dataView,
  timeInterval,
  response,
}: {
  data: DataPublicPluginStart;
  dataView: DataView;
  timeInterval?: string;
  response?: SearchResponse;
}) => {
  if (!timeInterval || !response) {
    return {};
  }

  const chartAggConfigs = getChartAggConfigs({ dataView, timeInterval, data });
  const bucketAggConfig = chartAggConfigs.aggs[1];
  const tabifiedData = tabifyAggResponse(chartAggConfigs, response);
  const dimensions = getDimensions(chartAggConfigs, data);
  const bucketInterval = search.aggs.isDateHistogramBucketAggConfig(bucketAggConfig)
    ? (bucketAggConfig?.buckets?.getInterval() as UnifiedHistogramBucketInterval)
    : undefined;
  const chartData = buildPointSeriesData(tabifiedData, dimensions!);

  return {
    bucketInterval,
    chartData,
  };
};
