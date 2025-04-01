/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import type { Metric, Series } from '../../../../common/types';
import { getSeriesAgg } from './series_agg';
import { SUPPORTED_METRICS } from '../metrics';
import {
  Column,
  convertToPercentileColumns,
  convertToPercentileRankColumns,
  convertMathToFormulaColumn,
  convertParentPipelineAggToColumns,
  convertToCumulativeSumColumns,
  convertOtherAggsToFormulaColumn,
  convertFilterRatioToFormulaColumn,
  convertToLastValueColumn,
  convertToStaticValueColumn,
  convertStaticValueToFormulaColumn,
  convertMetricAggregationColumnWithoutSpecialParams,
  convertToCounterRateColumn,
  convertToStandartDeviationColumn,
  convertVarianceToFormulaColumn,
} from '../convert';
import { getValidColumns } from './columns';

export const getMetricsColumns = (
  series: Series,
  dataView: DataView,
  visibleSeriesCount: number,
  {
    isStaticValueColumnSupported = false,
    reducedTimeRange,
  }: { reducedTimeRange?: string; isStaticValueColumnSupported?: boolean } = {}
): Column[] | null => {
  const { metrics: validMetrics, seriesAgg } = getSeriesAgg(
    series.metrics as [Metric, ...Metric[]]
  );

  if (!validMetrics.length) {
    return null;
  }
  const metrics = validMetrics as [Metric, ...Metric[]];
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

  const columnsConverterArgs = { series, metrics, dataView };
  switch (aggregation) {
    case 'percentile': {
      const percentileColumns = convertToPercentileColumns(
        { series, metric: metrics[metricIdx], dataView },
        { reducedTimeRange, timeShift: series.offset_time }
      );

      return getValidColumns(percentileColumns);
    }
    case 'percentile_rank': {
      const percentileRankColumns = convertToPercentileRankColumns(
        { series, metric: metrics[metricIdx], dataView },
        { reducedTimeRange, timeShift: series.offset_time }
      );

      return getValidColumns(percentileRankColumns);
    }
    case 'math': {
      const formulaColumn = convertMathToFormulaColumn(columnsConverterArgs, reducedTimeRange);
      return getValidColumns(formulaColumn);
    }
    case 'derivative':
    case 'moving_average': {
      const movingAverageOrDerivativeColumns = convertParentPipelineAggToColumns(
        columnsConverterArgs,
        reducedTimeRange
      );
      return getValidColumns(movingAverageOrDerivativeColumns);
    }
    case 'cumulative_sum': {
      const cumulativeSumColumns = convertToCumulativeSumColumns(
        columnsConverterArgs,
        reducedTimeRange
      );
      return getValidColumns(cumulativeSumColumns);
    }
    case 'filter_ratio': {
      const formulaColumn = convertFilterRatioToFormulaColumn(
        columnsConverterArgs,
        reducedTimeRange
      );
      return getValidColumns(formulaColumn);
    }
    case 'positive_rate': {
      const formulaColumn = convertToCounterRateColumn(columnsConverterArgs);
      return getValidColumns(formulaColumn);
    }
    case 'positive_only':
    case 'avg_bucket':
    case 'max_bucket':
    case 'min_bucket':
    case 'sum_bucket': {
      const formulaColumn = convertOtherAggsToFormulaColumn(
        aggregation,
        columnsConverterArgs,
        reducedTimeRange
      );
      return getValidColumns(formulaColumn);
    }
    case 'top_hit': {
      const column = convertToLastValueColumn(columnsConverterArgs, reducedTimeRange);
      return getValidColumns(column);
    }
    case 'variance': {
      const column = convertVarianceToFormulaColumn(columnsConverterArgs, reducedTimeRange);
      return getValidColumns(column);
    }
    case 'static': {
      const column = isStaticValueColumnSupported
        ? convertToStaticValueColumn(columnsConverterArgs, {
            visibleSeriesCount,
            reducedTimeRange,
          })
        : convertStaticValueToFormulaColumn(columnsConverterArgs);
      return getValidColumns(column);
    }
    case 'std_deviation': {
      const column = convertToStandartDeviationColumn(columnsConverterArgs, reducedTimeRange);
      return getValidColumns(column);
    }
    default: {
      const column = convertMetricAggregationColumnWithoutSpecialParams(
        aggregationMap,
        columnsConverterArgs,
        { reducedTimeRange, timeShift: series.offset_time }
      );
      return getValidColumns(column);
    }
  }
};
