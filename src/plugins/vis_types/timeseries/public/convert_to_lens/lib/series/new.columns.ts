/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Column } from '@kbn/visualizations-plugin/common';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { Series } from '../../../../common/types';
import { getSeriesAgg } from './get_series_agg';
import { SUPPORTED_METRICS } from '../metrics';
import { convertToPercentileColumns, convertToPercentileRankColumns } from '../convert';
import { convertMetricsToColumns } from '../convert/column';

export const getColumns = (series: Series, dataView: DataView): Column[] | null => {
  const { metrics } = getSeriesAgg(series.metrics);
  const metricIdx = metrics.length - 1;
  const aggregation = metrics[metricIdx].type;
  const aggregationMap = SUPPORTED_METRICS[aggregation];
  if (!aggregationMap) {
    return null;
  }

  switch (aggregation) {
    case 'percentile': {
      return convertMetricsToColumns(series, metrics, dataView, convertToPercentileColumns);
    }
    case 'percentile_rank': {
      return convertMetricsToColumns(series, metrics, dataView, convertToPercentileRankColumns);
    }
  }

  return [];
};
