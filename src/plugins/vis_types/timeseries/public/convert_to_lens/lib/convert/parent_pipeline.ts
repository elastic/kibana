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
  CommonColumnConverterArgs,
  CommonColumnsConverterArgs,
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
  SupportedMetric,
  SUPPORTED_METRICS,
} from '../metrics';
import { createColumn, getFormat } from './column';
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
  | typeof Operations.SUM
  | typeof Operations.STANDARD_DEVIATION;

type MetricAggregation =
  | MetricAggregationWithoutParams
  | typeof Operations.LAST_VALUE
  | typeof Operations.PERCENTILE
  | typeof Operations.PERCENTILE_RANK;

type MetricAggregationColumnWithSpecialParams =
  | PercentileColumn
  | PercentileRanksColumn
  | LastValueColumn;

type MetricAggregationColumnWithoutSpecialParams =
  | AvgColumn
  | CountColumn
  | CardinalityColumn
  | CounterRateColumn
  | MaxColumn
  | MinColumn
  | SumColumn;

type MetricAggregationColumn =
  | MetricAggregationColumnWithoutSpecialParams
  | MetricAggregationColumnWithSpecialParams;

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
  Operations.STANDARD_DEVIATION,
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

export const convertMetricAggregationColumnWithoutSpecialParams = (
  aggregation: SupportedMetric,
  { series, metrics, dataView }: CommonColumnsConverterArgs,
  window?: string
): MetricAggregationColumnWithoutSpecialParams | null => {
  if (!isSupportedAggregationWithoutParams(aggregation.name)) {
    return null;
  }
  const metric = metrics[metrics.length - 1];
  const sourceField = aggregation.isFieldRequired && metric.field ? metric.field : 'document';

  const field = dataView.getFieldByName(sourceField);
  if (!field && aggregation.isFieldRequired) {
    return null;
  }

  return {
    operationType: aggregation.name,
    sourceField,
    ...createColumn(series, metric, field, { window }),
    params: { ...getFormat(series, field?.name, dataView) },
  } as MetricAggregationColumnWithoutSpecialParams;
};

export const convertMetricAggregationToColumn = (
  aggregation: SupportedMetric,
  series: Series,
  metric: Metric,
  dataView: DataView,
  { metaValue, window }: { metaValue?: number; window?: string } = {}
): MetricAggregationColumn | null => {
  if (!isSupportedAggregation(aggregation.name)) {
    return null;
  }

  const field = dataView.getFieldByName(metric.field ?? 'document');
  if (!field) {
    return null;
  }

  if (aggregation.name === Operations.PERCENTILE) {
    return convertToPercentileColumn(metaValue, { series, metric, dataView }, { window });
  }

  if (aggregation.name === Operations.PERCENTILE_RANK) {
    return convertToPercentileRankColumn(metaValue?.toString() ?? '', series, metric, dataView, {
      window,
    });
  }

  if (aggregation.name === Operations.LAST_VALUE) {
    return null;
  }

  return convertMetricAggregationColumnWithoutSpecialParams(
    aggregation,
    { series, metrics: [metric], dataView },
    window
  );
};

export const computeParentPipelineColumns = (
  aggregation: ParentPipelineAggregation,
  { series, metric, dataView }: CommonColumnConverterArgs,
  subFunctionMetric: Metric,
  pipelineAgg: SupportedMetric,
  { metaValue, window }: { metaValue?: number; window?: string } = {}
) => {
  const agg = SUPPORTED_METRICS[metric.type];
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
    return createFormulaColumn(formula, { series, metric, dataView });
  }

  const metricAggregationColumn = convertMetricAggregationToColumn(
    pipelineAgg,
    series,
    subFunctionMetric,
    dataView,
    { metaValue, window }
  );

  if (!metricAggregationColumn) {
    return null;
  }

  return [
    metricAggregationColumn,
    createParentPipelineAggregationColumn(aggregation, { series, metric, dataView }, [
      metricAggregationColumn.columnId,
    ]),
  ];
};

const convertMovingAvgOrDerivativeToColumns = (
  aggregation: typeof METRIC_TYPES.DERIVATIVE | typeof TSVB_METRIC_TYPES.MOVING_AVERAGE,
  metric: Metric,
  { series, metrics, dataView }: CommonColumnsConverterArgs,
  window?: string
) => {
  //  percentile value is derived from the field Id. It has the format xxx-xxx-xxx-xxx[percentile]
  const [fieldId, meta] = metric?.field?.split('[') ?? [];
  const subFunctionMetric = metrics.find(({ id }) => id === fieldId);
  if (!subFunctionMetric || subFunctionMetric.type === 'static') {
    return null;
  }

  const pipelineAgg = SUPPORTED_METRICS[subFunctionMetric.type];
  if (!pipelineAgg) {
    return null;
  }
  const metaValue = Number(meta?.replace(']', ''));
  const subMetricField = subFunctionMetric.field;
  const [nestedFieldId, _] = subMetricField?.split('[') ?? [];
  // support nested aggs with formula
  const additionalSubFunction = metrics.find(({ id }) => id === nestedFieldId);
  if (additionalSubFunction) {
    const formula = getParentPipelineSeriesFormula(
      metrics,
      subFunctionMetric,
      pipelineAgg,
      metric.type,
      { metaValue, window }
    );
    if (!formula) {
      return null;
    }

    return createFormulaColumn(formula, { series, metric, dataView });
  } else {
    const agg = SUPPORTED_METRICS[aggregation];
    if (!agg) {
      return null;
    }

    return computeParentPipelineColumns(
      agg.name,
      { series, metric, dataView },
      subFunctionMetric,
      pipelineAgg,
      { metaValue, window }
    );
  }
};

export const convertParentPipelineAggToColumns = (
  { series, metrics, dataView }: CommonColumnsConverterArgs,
  window?: string
) => {
  const currentMetric = metrics[metrics.length - 1];

  if (currentMetric.type === 'moving_average' || currentMetric.type === 'derivative') {
    return convertMovingAvgOrDerivativeToColumns(
      currentMetric.type,
      currentMetric,
      { series, metrics, dataView },
      window
    );
  }
  return null;
};

export const createParentPipelineAggregationColumn = (
  aggregation: ParentPipelineAggregation,
  { series, metric, dataView }: CommonColumnConverterArgs,
  references: string[] = []
) => {
  const params =
    aggregation === 'moving_average'
      ? convertToMovingAverageParams(metric)
      : getFormat(series, metric.field, dataView);

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
