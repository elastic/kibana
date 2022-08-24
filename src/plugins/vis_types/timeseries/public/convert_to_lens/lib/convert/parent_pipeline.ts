/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { METRIC_TYPES } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import { Operations } from '@kbn/visualizations-plugin/common/convert_to_lens';
import {
  AvgColumn,
  CardinalityColumn,
  CountColumn,
  CounterRateColumn,
  CumulativeSumColumn,
  DerivativeColumn,
  LastValueColumn,
  MaxColumn,
  MinColumn,
  MovingAverageColumn,
  PercentileColumn,
  PercentileRanksColumn,
  SumColumn,
} from './types';
import { TSVB_METRIC_TYPES } from '../../../../common/enums';
import { Metric, Series } from '../../../../common/types';
import {
  getFilterRatioFormula,
  getFormulaFromMetric,
  getParentPipelineSeriesFormula,
  getPipelineAgg,
  SupportedMetric,
  SUPPORTED_METRICS,
} from '../metrics';
import { createColumn } from './column';
import { createFormulaColumn } from './formula';
import { convertToMovingAverageParams } from './moving_average';
import { convertToPercentileColumn } from './percentile';
import { convertToPercentileRankColumn } from './percentile_rank';

type MetricAggregationWithoutParams =
  | typeof Operations.AVERAGE
  | typeof Operations.COUNT
  | typeof Operations.UNIQUE_COUNT
  | typeof Operations.COUNTER_RATE
  | typeof Operations.MAX
  | typeof Operations.MIN
  | typeof Operations.SUM;

type MetricAggregation =
  | MetricAggregationWithoutParams
  | typeof Operations.LAST_VALUE
  | typeof Operations.PERCENTILE
  | typeof Operations.PERCENTILE_RANK;

type MetricAggregationColumnWithParams = PercentileColumn | PercentileRanksColumn | LastValueColumn;

type MetricAggregationColumnWithoutParams =
  | AvgColumn
  | CountColumn
  | CardinalityColumn
  | CounterRateColumn
  | MaxColumn
  | MinColumn
  | SumColumn;

type MetricAggregationColumn =
  | MetricAggregationColumnWithoutParams
  | MetricAggregationColumnWithParams;

type ParentPipelineAggregation =
  | typeof Operations.MOVING_AVERAGE
  | typeof Operations.DIFFERENCES
  | typeof Operations.CUMULATIVE_SUM;

type ParentPipelineAggColumn = MovingAverageColumn | DerivativeColumn | CumulativeSumColumn;

const SUPPORTED_METRICS_AGGS_WITHOUT_PARAMS: MetricAggregationWithoutParams[] = [
  Operations.AVERAGE,
  Operations.COUNT,
  Operations.UNIQUE_COUNT,
  Operations.COUNTER_RATE,
  Operations.MAX,
  Operations.MIN,
  Operations.SUM,
];

const SUPPORTED_METRIC_AGGS: MetricAggregation[] = [
  ...SUPPORTED_METRICS_AGGS_WITHOUT_PARAMS,
  Operations.LAST_VALUE,
  Operations.PERCENTILE,
  Operations.PERCENTILE_RANK,
];

const isSupportedAggregation = (agg: string): agg is MetricAggregation => {
  return (SUPPORTED_METRIC_AGGS as string[]).includes(agg);
};

const isSupportedAggregationWithoutParams = (
  agg: string
): agg is MetricAggregationWithoutParams => {
  return (SUPPORTED_METRICS_AGGS_WITHOUT_PARAMS as string[]).includes(agg);
};

export const convertMetricAggregationColumnWithoutParams = (
  aggregation: SupportedMetric,
  series: Series,
  metric: Metric,
  dataView: DataView,
  window?: string
): MetricAggregationColumnWithoutParams | null => {
  if (!isSupportedAggregationWithoutParams(aggregation.name)) {
    return null;
  }
  const sourceField = aggregation.name !== 'count' && metric.field ? metric.field : 'document';

  const field = dataView.getFieldByName(sourceField);
  if (!field && aggregation.name !== 'count') {
    return null;
  }

  return {
    operationType: aggregation.name,
    sourceField,
    ...createColumn(series, metric, field, false, false, window),
    params: {},
  } as MetricAggregationColumnWithoutParams;
};

export const convertMetricAggregationToColumn = (
  aggregation: SupportedMetric,
  series: Series,
  metric: Metric,
  dataView: DataView,
  meta?: number,
  window?: string
): MetricAggregationColumn | null => {
  if (!isSupportedAggregation(aggregation.name)) {
    return null;
  }

  const field = dataView.getFieldByName(metric.field ?? 'document');
  if (!field) {
    return null;
  }

  if (aggregation.name === Operations.PERCENTILE) {
    return convertToPercentileColumn(meta, series, metric, dataView, undefined, window);
  }

  if (aggregation.name === Operations.PERCENTILE_RANK) {
    return convertToPercentileRankColumn(
      meta?.toString() ?? '',
      series,
      metric,
      dataView,
      undefined,
      window
    );
  }

  if (aggregation.name === Operations.LAST_VALUE) {
    return null;
  }

  return convertMetricAggregationColumnWithoutParams(aggregation, series, metric, dataView, window);
};

export const computeParentPipelineColumns = (
  aggregation: ParentPipelineAggregation,
  series: Series,
  currentMetric: Metric,
  dataView: DataView,
  subFunctionMetric: Metric,
  pipelineAgg: SupportedMetric,
  meta?: number,
  window?: string
) => {
  const agg = SUPPORTED_METRICS[currentMetric.type];
  if (!agg) {
    return null;
  }

  const aggFormula = getFormulaFromMetric(agg);

  if (subFunctionMetric.type === 'filter_ratio') {
    const script = getFilterRatioFormula(subFunctionMetric, window);
    if (!script) {
      return null;
    }
    const formula = `${aggFormula}(${script})`;
    return createFormulaColumn(formula, series, currentMetric);
  }

  const metricAggregationColumn = convertMetricAggregationToColumn(
    pipelineAgg,
    series,
    subFunctionMetric,
    dataView,
    meta,
    window
  );

  if (!metricAggregationColumn) {
    return null;
  }

  return [
    metricAggregationColumn,
    createParentPipelineAggregationColumn(aggregation, series, currentMetric, [
      metricAggregationColumn.columnId,
    ]),
  ];
};

const convertMovingAvgOrDerivativeToColumns = (
  aggregation: typeof METRIC_TYPES.DERIVATIVE | typeof TSVB_METRIC_TYPES.MOVING_AVERAGE,
  currentMetric: Metric,
  series: Series,
  metrics: Metric[],
  dataView: DataView,
  window?: string
) => {
  //  percentile value is derived from the field Id. It has the format xxx-xxx-xxx-xxx[percentile]
  const [fieldId, meta] = currentMetric?.field?.split('[') ?? [];
  const subFunctionMetric = metrics.find((metric) => metric.id === fieldId);
  if (!subFunctionMetric || subFunctionMetric.type === 'static') {
    return null;
  }

  const pipelineAgg = getPipelineAgg(subFunctionMetric.type);
  if (!pipelineAgg) {
    return null;
  }
  const metaValue = Number(meta?.replace(']', ''));
  const subMetricField = subFunctionMetric.field;
  const [nestedFieldId, _] = subMetricField?.split('[') ?? [];
  // support nested aggs with formula
  const additionalSubFunction = metrics.find((metric) => metric.id === nestedFieldId);
  if (additionalSubFunction) {
    const formula = getParentPipelineSeriesFormula(
      metrics,
      subFunctionMetric,
      pipelineAgg,
      currentMetric.type,
      metaValue,
      window
    );
    if (!formula) {
      return null;
    }

    return createFormulaColumn(formula, series, currentMetric);
  } else {
    const agg = SUPPORTED_METRICS[aggregation];
    if (!agg) {
      return null;
    }

    return computeParentPipelineColumns(
      agg.name,
      series,
      currentMetric,
      dataView,
      subFunctionMetric,
      pipelineAgg,
      metaValue,
      window
    );
  }
};

export const convertParentPipelineAggToColumns = (
  series: Series,
  metrics: Metric[],
  dataView: DataView,
  window?: string
) => {
  const currentMetric = metrics[metrics.length - 1];

  if (currentMetric.type === 'moving_average' || currentMetric.type === 'derivative') {
    return convertMovingAvgOrDerivativeToColumns(
      currentMetric.type,
      currentMetric,
      series,
      metrics,
      dataView,
      window
    );
  }
  return null;
};

export const createParentPipelineAggregationColumn = (
  aggregation: ParentPipelineAggregation,
  series: Series,
  metric: Metric,
  references: string[] = []
) => {
  const params =
    aggregation === 'moving_average' ? convertToMovingAverageParams(metric) : undefined;
  if (params === null) {
    return null;
  }

  return {
    operationType: aggregation,
    references,
    ...createColumn(series, metric),
    params,
  } as ParentPipelineAggColumn;
};
