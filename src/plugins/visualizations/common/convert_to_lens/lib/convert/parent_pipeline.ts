/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { METRIC_TYPES } from '@kbn/data-plugin/common';
import { convertToSchemaConfig } from '../../../vis_schemas';
import { SchemaConfig } from '../../..';
import {
  Column,
  CumulativeSumColumn,
  DerivativeColumn,
  FormulaColumn,
  MovingAverageColumn,
  MovingAverageParams,
} from '../../types';
import { convertMetricToColumns, getFormulaForPipelineAgg } from '../metrics';
import { createColumn } from './column';
import { createFormulaColumn } from './formula';
import {
  convertMetricAggregationColumnWithoutSpecialParams,
  MetricAggregationColumnWithoutSpecialParams,
  MetricsWithoutSpecialParams,
} from './metric';
import { SUPPORTED_METRICS } from './supported_metrics';
import { CommonColumnConverterArgs, OtherParentPipelineAggs } from './types';
import { PIPELINE_AGGS, SIBLING_PIPELINE_AGGS } from './constants';

export type ParentPipelineAggColumn = MovingAverageColumn | DerivativeColumn | CumulativeSumColumn;

export const convertToMovingAverageParams = (
  agg: SchemaConfig<METRIC_TYPES.MOVING_FN>
): MovingAverageParams => ({
  window: agg.aggParams!.window ?? 0,
});

export const convertToOtherParentPipelineAggColumns = (
  { agg, dataView }: CommonColumnConverterArgs<OtherParentPipelineAggs>,
  reducedTimeRange?: string
): FormulaColumn | [ParentPipelineAggColumn, Column] | null => {
  const { aggParams, aggType } = agg;
  if (!aggParams) {
    return null;
  }

  const op = SUPPORTED_METRICS[aggType];
  if (!op) {
    return null;
  }

  const { customMetric } = aggParams;
  if (!customMetric) {
    return null;
  }

  const subAgg = SUPPORTED_METRICS[customMetric.type.name as METRIC_TYPES];

  if (!subAgg) {
    return null;
  }

  const metric = convertToSchemaConfig(customMetric) as SchemaConfig<MetricsWithoutSpecialParams>;

  if (SIBLING_PIPELINE_AGGS.includes(metric.aggType)) {
    return null;
  }

  if (PIPELINE_AGGS.includes(metric.aggType)) {
    const formula = getFormulaForPipelineAgg(agg, reducedTimeRange);
    if (!formula) {
      return null;
    }

    return createFormulaColumn(formula, agg);
  }

  const subMetric = convertMetricToColumns(metric, dataView);

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
  { agg, dataView }: CommonColumnConverterArgs<METRIC_TYPES.CUMULATIVE_SUM>,
  reducedTimeRange?: string
):
  | FormulaColumn
  | [ParentPipelineAggColumn, MetricAggregationColumnWithoutSpecialParams]
  | null => {
  const { aggParams, aggType } = agg;
  if (!aggParams) {
    return null;
  }

  const { customMetric } = aggParams;
  if (!customMetric) {
    return null;
  }

  const subAgg = SUPPORTED_METRICS[customMetric.type.name as METRIC_TYPES];

  if (!subAgg) {
    return null;
  }
  const metric = convertToSchemaConfig(customMetric) as SchemaConfig<MetricsWithoutSpecialParams>;

  if (SIBLING_PIPELINE_AGGS.includes(metric.aggType)) {
    return null;
  }

  if ((!customMetric.getField() && subAgg.name === 'count') || subAgg.name === 'sum') {
    // create column for sum or count
    const subMetric = convertMetricAggregationColumnWithoutSpecialParams(
      subAgg,
      { agg: metric, dataView },
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
        references: [subMetric?.columnId],
        ...createColumn(agg),
        params: {},
        timeShift: agg.aggParams?.timeShift,
      } as ParentPipelineAggColumn,

      subMetric,
    ];
  } else {
    const formula = getFormulaForPipelineAgg(agg, reducedTimeRange);
    if (!formula) {
      return null;
    }

    return createFormulaColumn(formula, agg);
  }
};
