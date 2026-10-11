/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { search, tabifyAggResponse } from '@kbn/data-plugin/public';
import type { DataSource } from '@kbn/data-source';
import { DataViewSource } from '@kbn/data-source';
import type { TimeRange } from '@kbn/es-query';
import type { UnifiedHistogramBucketInterval } from '../../../types';
import { getChartAggConfigs } from './get_chart_agg_configs';

/**
 * Convert the response from the chart request into a format that can be used
 * by the Unified Histogram chart. The returned object should be used to update
 * time range interval of histogram.
 */
export const buildBucketInterval = ({
  data,
  dataSource,
  timeInterval,
  timeRange,
  response,
}: {
  data: DataPublicPluginStart;
  dataSource: DataSource;
  timeInterval?: string;
  timeRange: TimeRange;
  response?: SearchResponse;
}) => {
  if (!timeInterval || !response) {
    return {};
  }

  if (!(dataSource instanceof DataViewSource)) {
    return {};
  }

  const dataView = dataSource.getDataView();
  const chartAggConfigs = getChartAggConfigs({ dataView, timeInterval, timeRange, data });
  const bucketAggConfig = chartAggConfigs.aggs[1];

  tabifyAggResponse(chartAggConfigs, response);

  return search.aggs.isDateHistogramBucketAggConfig(bucketAggConfig)
    ? (bucketAggConfig?.buckets?.getInterval() as UnifiedHistogramBucketInterval)
    : undefined;
};
