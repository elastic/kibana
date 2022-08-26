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
  convertToCounterRateFormulaColumn,
  convertToStandartDeviationColumn,
} from '../convert';
import { getValidColumns } from './columns';

export const getMetricsColumns = (
  series: Series,
  dataView: DataView,
  visibleSeriesCount: number,
  window?: string
): Column[] | null => {
  const { metrics, seriesAgg } = getSeriesAgg(series.metrics);
  // series agg supported as collapseFn if we have split
  if (seriesAgg && series.split_mode === 'everything') {
    return null;
  }
  const metricIdx = metrics.length - 1;
  const aggregation = metrics[metricIdx].type;
  const aggregationMap = SUPPORTED_METRICS[aggregation];
  if (!aggregationMap) {
    return null;
  }

  switch (aggregation) {
    case 'percentile': {
      const percentileColumns = convertMetricsToColumns(
        series,
        metrics,
        dataView,
        convertToPercentileColumns,
        window
      );
      return getValidColumns(percentileColumns);
    }
    case 'percentile_rank': {
      const percentileRankColumns = convertMetricsToColumns(
        series,
        metrics,
        dataView,
        convertToPercentileRankColumns,
        window
      );
      return getValidColumns(percentileRankColumns);
    }
    case 'math': {
      const formulaColumn = convertMathToFormulaColumn(series, metrics, window);
      return getValidColumns(formulaColumn);
    }
    case 'derivative':
    case 'moving_average': {
      const movingAverageOrDerivativeColumns = convertParentPipelineAggToColumns(
        series,
        metrics,
        dataView,
        window
      );
      return getValidColumns(movingAverageOrDerivativeColumns);
    }
    case 'cumulative_sum': {
      const cumulativeSumColumns = convertToCumulativeSumColumns(series, metrics, dataView, window);
      return getValidColumns(cumulativeSumColumns);
    }
    case 'filter_ratio': {
      const formulaColumn = convertFilterRatioToFormulaColumn(series, metrics, window);
      return getValidColumns(formulaColumn);
    }
    case 'positive_rate': {
      const formulaColumn = convertToCounterRateFormulaColumn(series, metrics, dataView);
      return getValidColumns(formulaColumn);
    }
    case 'positive_only':
    case 'avg_bucket':
    case 'max_bucket':
    case 'min_bucket':
    case 'sum_bucket': {
      const formulaColumn = convertOtherAggsToFormulaColumn(aggregation, series, metrics, window);
      return getValidColumns(formulaColumn);
    }
    case 'top_hit': {
      const column = convertToLastValueColumn(series, metrics, dataView, window);
      return getValidColumns(column);
    }
    case 'static': {
      const column = convertToStaticValueColumn(series, metrics, { visibleSeriesCount, window });
      return getValidColumns(column);
    }
    case 'std_deviation': {
      const column = convertToStandartDeviationColumn(series, metrics, dataView, window);
      return getValidColumns(column);
    }
    default: {
      const column = convertMetricAggregationColumnWithoutParams(
        aggregationMap,
        series,
        metrics[metricIdx],
        dataView,
        window
      );
      return getValidColumns(column);
    }
  }
};
