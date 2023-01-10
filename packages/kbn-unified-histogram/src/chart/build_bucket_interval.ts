/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { TimeRange } from '@kbn/es-query';
import { tabifyAggResponse } from '@kbn/data-plugin/common';
import type { SearchType, UnifiedHistogramBucketInterval } from '../types';
import { getChartAggConfigs } from './get_chart_agg_configs';

/**
 * Convert the response from the chart request into a format that can be used
 * by the unified histogram chart. The returned object should be used to update
 * time range interval of histogram.
 */
export const buildBucketInterval = ({
  search,
  data,
  dataView,
  timeInterval,
  timeRange,
  response,
}: {
  search: SearchType;
  data: DataPublicPluginStart;
  dataView: DataView;
  timeInterval?: string;
  timeRange: TimeRange;
  response?: SearchResponse;
}) => {
  if (!timeInterval || !response) {
    return {};
  }

  const chartAggConfigs = getChartAggConfigs({ dataView, timeInterval, timeRange, data });
  const bucketAggConfig = chartAggConfigs.aggs[1];

  tabifyAggResponse(chartAggConfigs, response);

  return search.aggs.isDateHistogramBucketAggConfig(bucketAggConfig)
    ? (bucketAggConfig?.buckets?.getInterval() as UnifiedHistogramBucketInterval)
    : undefined;
};
