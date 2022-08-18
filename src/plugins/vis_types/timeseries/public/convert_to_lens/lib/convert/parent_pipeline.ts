/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { METRIC_TYPES } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
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
  Operations,
  PercentileColumn,
  PercentileRanksColumn,
  SumColumn,
} from '@kbn/visualizations-plugin/common';
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
import { convertToPercentileParams } from './percentile';
import { convertToPercentileRankParams } from './percentile_rank';

type PipelineAggregation =
  | typeof Operations.AVERAGE
  | typeof Operations.COUNT
  | typeof Operations.UNIQUE_COUNT
  | typeof Operations.COUNTER_RATE
  | typeof Operations.MAX
  | typeof Operations.MIN
  | typeof Operations.SUM
  | typeof Operations.LAST_VALUE
  | typeof Operations.PERCENTILE
  | typeof Operations.PERCENTILE_RANK;

type PipelineAggregationColumnWithParams =
  | PercentileColumn
  | PercentileRanksColumn
  | LastValueColumn;

type PipelineAggregationColumnWithoutParams =
  | AvgColumn
  | CountColumn
  | CardinalityColumn
  | CounterRateColumn
  | MaxColumn
  | MinColumn
  | SumColumn;

type PipelineAggregationColumn =
  | PipelineAggregationColumnWithoutParams
  | PipelineAggregationColumnWithParams;

type ParentPipelineAggregation =
  | typeof Operations.MOVING_AVERAGE
  | typeof Operations.DIFFERENCES
  | typeof Operations.CUMULATIVE_SUM;

type ParentPipelineAggColumn = MovingAverageColumn | DerivativeColumn | CumulativeSumColumn;

const SUPPORTED_PARENT_PIPELINE_AGGS: PipelineAggregation[] = [
  Operations.AVERAGE,
  Operations.COUNT,
  Operations.UNIQUE_COUNT,
  Operations.COUNTER_RATE,
  Operations.MAX,
  Operations.MIN,
  Operations.SUM,
  Operations.LAST_VALUE,
  Operations.PERCENTILE,
  Operations.PERCENTILE_RANK,
];

const isSupportedAggregation = (agg: string): agg is PipelineAggregation => {
  return (SUPPORTED_PARENT_PIPELINE_AGGS as string[]).includes(agg);
};

export const convertPipelineAggToColumn = (
  aggregation: SupportedMetric,
  series: Series,
  parentPipelineMetric: Metric,
  dataView: DataView,
  meta?: number
): PipelineAggregationColumn | null => {
  if (!isSupportedAggregation(aggregation.name)) {
    return null;
  }

  const field = dataView.getFieldByName(parentPipelineMetric.field ?? 'document');
  if (!field) {
    return null;
  }

  if (aggregation.name === Operations.PERCENTILE) {
    const params = convertToPercentileParams(meta);
    return params
      ? {
          operationType: aggregation.name,
          sourceField: field.name,
          ...createColumn(series, parentPipelineMetric, field),
          params,
        }
      : null;
  }

  if (aggregation.name === Operations.PERCENTILE_RANK) {
    const params = convertToPercentileRankParams(meta?.toString() ?? '');
    return params
      ? {
          operationType: aggregation.name,
          sourceField: field.name,
          ...createColumn(series, parentPipelineMetric, field),
          params,
        }
      : null;
  }

  if (aggregation.name === Operations.LAST_VALUE) {
    return null;
  }

  return {
    operationType: aggregation.name,
    sourceField: field.name,
    ...createColumn(series, parentPipelineMetric, field),
    params: {},
  } as PipelineAggregationColumnWithoutParams;
};

export const computeParentPipelineColumns = (
  aggregation: ParentPipelineAggregation,
  series: Series,
  currentMetric: Metric,
  dataView: DataView,
  subFunctionMetric: Metric,
  pipelineAgg: SupportedMetric,
  meta?: number
) => {
  const agg = SUPPORTED_METRICS[currentMetric.type];
  if (!agg) {
    return null;
  }

  const aggFormula = getFormulaFromMetric(agg);

  if (subFunctionMetric.type === 'filter_ratio') {
    const script = getFilterRatioFormula(subFunctionMetric);
    if (!script) {
      return null;
    }
    const formula = `${aggFormula}(${script})`;
    return createFormulaColumn(formula, series, currentMetric, dataView);
  }

  const pipelineAggColumn = convertPipelineAggToColumn(
    pipelineAgg,
    series,
    subFunctionMetric,
    dataView,
    meta
  );

  if (!pipelineAggColumn) {
    return null;
  }

  return [
    pipelineAggColumn,
    createPipelineAggregationColumn(aggregation, series, currentMetric, dataView, [
      pipelineAggColumn.columnId,
    ]),
  ];
};

const convertMovingAvgOrDerivativeToColumns = (
  aggregation: typeof METRIC_TYPES.DERIVATIVE | typeof TSVB_METRIC_TYPES.MOVING_AVERAGE,
  currentMetric: Metric,
  series: Series,
  metrics: Metric[],
  dataView: DataView
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
      metaValue
    );
    if (!formula) {
      return null;
    }

    return createFormulaColumn(formula, series, currentMetric, dataView);
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
      metaValue
    );
  }
};

export const convertParentPipelineAggToColumns = (
  series: Series,
  metrics: Metric[],
  dataView: DataView
) => {
  const currentMetric = metrics[metrics.length - 1];

  if (currentMetric.type === 'moving_average' || currentMetric.type === 'derivative') {
    return convertMovingAvgOrDerivativeToColumns(
      currentMetric.type,
      currentMetric,
      series,
      metrics,
      dataView
    );
  }
};

export const createPipelineAggregationColumn = (
  aggregation: ParentPipelineAggregation,
  series: Series,
  metric: Metric,
  dataView: DataView,
  references: string[] = []
) => {
  const params =
    aggregation === 'moving_average' ? convertToMovingAverageParams(metric) : undefined;
  if (params === null) {
    return null;
  }

  const field = dataView.getFieldByName(metric.field ?? 'document');
  if (!field) {
    return null;
  }

  return {
    operationType: aggregation,
    references,
    ...createColumn(series, metric, field),
    params,
  } as ParentPipelineAggColumn;
};
