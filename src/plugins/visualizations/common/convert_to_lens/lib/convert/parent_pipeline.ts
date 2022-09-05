/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { METRIC_TYPES } from '@kbn/data-plugin/common';
import { SchemaConfig } from '../../..';
import { Operations } from '../../constants';
import {
  CumulativeSumColumn,
  DerivativeColumn,
  FormulaColumn,
  MovingAverageColumn,
  MovingAverageParams,
} from '../../types';
import { getFormulaForParentPipelineAgg } from '../metrics';
import { createColumn } from './column';
import { createFormulaColumn } from './formula';
import {
  convertСustomMetricAggregationColumnWithoutSpecialParams,
  MetricAggregationColumnWithoutSpecialParams,
} from './metric';
import { SUPPORTED_METRICS } from './supported_metrics';
import { CommonColumnConverterArgs } from './types';

export type ParentPipelineAggColumn = MovingAverageColumn | DerivativeColumn | CumulativeSumColumn;

export const convertToMovingAverageParams = (
  agg: SchemaConfig<METRIC_TYPES.MOVING_FN>
): MovingAverageParams => ({
  window: agg.aggParams!.window ?? 0,
});

export const convertToParentPipelineAggColumns = (
  {
    agg,
    dataView,
  }:
    | CommonColumnConverterArgs<METRIC_TYPES.CUMULATIVE_SUM>
    | CommonColumnConverterArgs<METRIC_TYPES.DERIVATIVE>
    | CommonColumnConverterArgs<METRIC_TYPES.MOVING_FN>,
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

  const subAgg = SUPPORTED_METRICS[customMetric.type.dslName as METRIC_TYPES];

  if (!subAgg) {
    return null;
  }

  if (subAgg.name === 'count' || subAgg.name === 'sum') {
    // create column for sum or count
    const subMetric = convertСustomMetricAggregationColumnWithoutSpecialParams(
      subAgg,
      { agg: customMetric, dataView },
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
        params:
          op.name === Operations.MOVING_AVERAGE
            ? convertToMovingAverageParams(agg as SchemaConfig<METRIC_TYPES.MOVING_FN>)
            : {},
      } as ParentPipelineAggColumn,
      subMetric,
    ];
  } else {
    const formula = getFormulaForParentPipelineAgg(agg, reducedTimeRange);
    if (!formula) {
      return null;
    }

    return createFormulaColumn(formula, agg);
  }
};
