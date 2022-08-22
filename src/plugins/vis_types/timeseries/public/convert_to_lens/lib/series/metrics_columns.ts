/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import type { Series } from '../../../../common/types';
import { getSeriesAgg } from './get_series_agg';
import { SUPPORTED_METRICS } from '../metrics';
import {
  Column,
  convertMetricsToColumns,
  convertToPercentileColumns,
  convertToPercentileRankColumns,
  convertMathToFormulaColumn,
  convertParentPipelineAggToColumns,
  convertToCumulativeSumColumns,
  convertOtherAggsToFormulaColumn,
  convertFilterRatioToFormulaColumn,
  convertToLastValueColumn,
  convertToStaticValueColumn,
  convertMetricAggregationColumnWithoutParams,
} from '../convert';
import { getValidColumns } from './columns';

export const getMetricsColumns = (
  series: Series,
  dataView: DataView,
  visibleSeriesCount: number
): Column[] | null => {
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
    case 'math': {
      const formulaColumn = convertMathToFormulaColumn(series, metrics);
      return formulaColumn ? [formulaColumn] : null;
    }
    case 'moving_average': {
      const movingAverageColumns = convertParentPipelineAggToColumns(series, metrics, dataView);
      return getValidColumns(movingAverageColumns);
    }
    case 'cumulative_sum': {
      const cumulativeSumColumns = convertToCumulativeSumColumns(series, metrics, dataView);
      return getValidColumns(cumulativeSumColumns);
    }
    case 'filter_ratio': {
      const formulaColumn = convertFilterRatioToFormulaColumn(series, metrics);
      return getValidColumns(formulaColumn);
    }
    case 'positive_only':
    case 'avg_bucket':
    case 'max_bucket':
    case 'min_bucket':
    case 'sum_bucket': {
      const formulaColumn = convertOtherAggsToFormulaColumn(aggregation, series, metrics);
      return getValidColumns(formulaColumn);
    }
    case 'top_hit': {
      const column = convertToLastValueColumn(series, metrics, dataView);
      return getValidColumns(column);
    }
    case 'static': {
      const column = convertToStaticValueColumn(series, metrics, visibleSeriesCount);
      return getValidColumns(column);
    }
    default: {
      const column = convertMetricAggregationColumnWithoutParams(
        aggregationMap,
        series,
        metrics[metricIdx],
        dataView
      );
      return getValidColumns(column);
    }
  }

  return [];
};
