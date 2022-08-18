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
  LastValueColumn,
  MaxColumn,
  MinColumn,
  Operations,
  PercentileColumn,
  PercentileRanksColumn,
  SumColumn,
} from '@kbn/visualizations-plugin/common';
import { TSVB_METRIC_TYPES } from '../../../../common/enums';
import { Metric, Series } from '../../../../common/types';
import {
  getFilterRatioFormula,
  getParentPipelineSeriesFormula,
  getPipelineAgg,
  SUPPORTED_METRICS,
} from '../metrics';
import { createColumn } from './column';
import { createFormulaColumn } from './formula';
import { createMovingAverageOrDerivativeColumn } from './moving_average';
import { convertToPercentileParams } from './percentile';
import { convertToPercentileRankParams } from './percentile_rank';

type ParentPipelineAggregation =
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

type ParentPipelineAggregationColumnWithParams =
  | PercentileColumn
  | PercentileRanksColumn
  | LastValueColumn;

type ParentPipelineAggregationColumnWithoutParams =
  | AvgColumn
  | CountColumn
  | CardinalityColumn
  | CounterRateColumn
  | MaxColumn
  | MinColumn
  | SumColumn;

type ParentPipelineAggregationColumn =
  | ParentPipelineAggregationColumnWithoutParams
  | ParentPipelineAggregationColumnWithParams;

const SUPPORTED_PARENT_PIPELINE_AGGS: ParentPipelineAggregation[] = [
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

const isSupportedAggregation = (agg: string): agg is ParentPipelineAggregation => {
  return !(SUPPORTED_PARENT_PIPELINE_AGGS as string[]).includes(agg);
};

export const convertParentPipelineAggToColumn = (
  aggregation: string,
  series: Series,
  parentPipelineMetric: Metric,
  dataView: DataView,
  meta?: number
): ParentPipelineAggregationColumn | null => {
  if (!isSupportedAggregation(aggregation)) {
    return null;
  }

  const field = dataView.getFieldByName(parentPipelineMetric.field ?? 'document');
  if (!field) {
    return null;
  }

  if (aggregation === Operations.PERCENTILE) {
    const params = convertToPercentileParams(meta);
    return params
      ? {
          operationType: aggregation,
          sourceField: field.name,
          ...createColumn(series, parentPipelineMetric, field),
          params,
        }
      : null;
  }

  if (aggregation === Operations.PERCENTILE_RANK) {
    const params = convertToPercentileRankParams(meta?.toString() ?? '');
    return params
      ? {
          operationType: aggregation,
          sourceField: field.name,
          ...createColumn(series, parentPipelineMetric, field),
          params,
        }
      : null;
  }

  if (aggregation === Operations.LAST_VALUE) {
    return null;
  }

  return {
    operationType: aggregation,
    sourceField: field.name,
    ...createColumn(series, parentPipelineMetric, field),
    params: {},
  } as ParentPipelineAggregationColumnWithoutParams;
};

export const computeParentPipelineColumns = (
  aggregation: typeof Operations.MOVING_AVERAGE | typeof Operations.DIFFERENCES,
  series: Series,
  currentMetric: Metric,
  dataView: DataView,
  subFunctionMetric: Metric,
  pipelineAgg: string,
  meta?: number
) => {
  const aggregationMap = SUPPORTED_METRICS[currentMetric.type];
  if (!aggregationMap) {
    return null;
  }

  if (subFunctionMetric.type === 'filter_ratio') {
    const script = getFilterRatioFormula(subFunctionMetric);
    if (!script) {
      return null;
    }
    const formula = `${aggregationMap.name}(${script})`;
    return createFormulaColumn(formula, series, currentMetric, dataView);
  }

  const parentPipelineAggColumn = convertParentPipelineAggToColumn(
    pipelineAgg,
    series,
    subFunctionMetric,
    dataView,
    meta
  );

  if (!parentPipelineAggColumn) {
    return null;
  }

  // should build moving_average column + pipelineAgg column
  return [
    parentPipelineAggColumn,
    createMovingAverageOrDerivativeColumn(aggregation, series, currentMetric, dataView, [
      parentPipelineAggColumn.columnId,
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
      pipelineAgg.name,
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
      pipelineAgg.name,
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
