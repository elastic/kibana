/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { METRIC_TYPES } from '@kbn/data-plugin/common';
import { SchemaConfig } from '../../..';
import { MovingAverageParams } from '../../types';
import { convertMetricToColumns, getFormulaForPipelineAgg } from '../metrics';
import { createColumn } from './column';
import { createFormulaColumn } from './formula';
import {
  convertMetricAggregationColumnWithoutSpecialParams,
  MetricAggregationColumnWithoutSpecialParams,
} from './metric';
import { SUPPORTED_METRICS } from './supported_metrics';
import {
  MovingAverageColumn,
  DerivativeColumn,
  CumulativeSumColumn,
  FormulaColumn,
  ExtendedColumnConverterArgs,
  OtherParentPipelineAggs,
  AggBasedColumn,
} from './types';
import { PIPELINE_AGGS, SIBLING_PIPELINE_AGGS } from './constants';
import { getMetricFromParentPipelineAgg } from '../utils';

export type ParentPipelineAggColumn = MovingAverageColumn | DerivativeColumn | CumulativeSumColumn;

export const convertToMovingAverageParams = (
  agg: SchemaConfig<METRIC_TYPES.MOVING_FN>
): MovingAverageParams => ({
  window: agg.aggParams!.window ?? 0,
});

export const convertToOtherParentPipelineAggColumns = (
  { agg, dataView, aggs, visType }: ExtendedColumnConverterArgs<OtherParentPipelineAggs>,
  reducedTimeRange?: string
): FormulaColumn | [ParentPipelineAggColumn, AggBasedColumn] | null => {
  const { aggType } = agg;
  const op = SUPPORTED_METRICS[aggType];
  if (!op) {
    return null;
  }

  const metric = getMetricFromParentPipelineAgg(agg, aggs);
  if (!metric) {
    return null;
  }

  const subAgg = SUPPORTED_METRICS[metric.aggType];

  if (!subAgg) {
    return null;
  }

  if (SIBLING_PIPELINE_AGGS.includes(metric.aggType)) {
    return null;
  }

  if (PIPELINE_AGGS.includes(metric.aggType)) {
    const formula = getFormulaForPipelineAgg({ agg, aggs, dataView, visType });
    if (!formula) {
      return null;
    }

    return createFormulaColumn(formula, agg);
  }

  const subMetric = convertMetricToColumns({ agg: metric, dataView, aggs, visType });

  if (subMetric === null) {
    return null;
  }

  return [
    {
      operationType: op.name,
      references: [subMetric[0].columnId],
      ...createColumn(agg),
      params: {},
      timeShift: agg.aggParams?.timeShift,
    } as ParentPipelineAggColumn,
    subMetric[0],
  ];
};

export const convertToCumulativeSumAggColumn = (
  { agg, dataView, aggs, visType }: ExtendedColumnConverterArgs<METRIC_TYPES.CUMULATIVE_SUM>,
  reducedTimeRange?: string
):
  | FormulaColumn
  | [ParentPipelineAggColumn, MetricAggregationColumnWithoutSpecialParams]
  | null => {
  const { aggParams, aggType } = agg;
  if (!aggParams) {
    return null;
  }
  const metric = getMetricFromParentPipelineAgg(agg, aggs);
  if (!metric) {
    return null;
  }

  const subAgg = SUPPORTED_METRICS[metric.aggType];

  if (!subAgg) {
    return null;
  }

  if (SIBLING_PIPELINE_AGGS.includes(metric.aggType)) {
    return null;
  }

  if (metric.aggType === METRIC_TYPES.COUNT || subAgg.name === 'sum') {
    // create column for sum or count
    const subMetric = convertMetricAggregationColumnWithoutSpecialParams(
      subAgg,
      { agg: metric as SchemaConfig<METRIC_TYPES.SUM | METRIC_TYPES.COUNT>, dataView, visType },
      reducedTimeRange
    );

    if (subMetric === null) {
      return null;
    }

    const op = SUPPORTED_METRICS[aggType];
    if (!op) {
      return null;
    }

    return [
      {
        operationType: op.name,
        ...createColumn(agg),
        references: [subMetric?.columnId],
        params: {},
        timeShift: agg.aggParams?.timeShift,
      } as ParentPipelineAggColumn,

      subMetric,
    ];
  } else {
    const formula = getFormulaForPipelineAgg({ agg, aggs, dataView, visType });
    if (!formula) {
      return null;
    }

    return createFormulaColumn(formula, agg);
  }
};
