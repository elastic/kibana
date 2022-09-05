/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { METRIC_TYPES } from '@kbn/data-plugin/common';
import { Operations } from '../../constants';
import { CumulativeSumColumn, FormulaColumn } from '../../types';
import { getFormulaForParentPipelineAgg } from '../metrics';
import { createColumn } from './column';
import { createFormulaColumn } from './formula';
import {
  convertСustomMetricAggregationColumnWithoutSpecialParams,
  MetricAggregationColumnWithoutSpecialParams,
} from './metric';
import { SUPPORTED_METRICS } from './supported_metrics';
import { CommonColumnConverterArgs } from './types';

export const convertToCumulativeSumColumns = (
  { agg, dataView }: CommonColumnConverterArgs<METRIC_TYPES.CUMULATIVE_SUM>,
  reducedTimeRange?: string
): FormulaColumn | [CumulativeSumColumn, MetricAggregationColumnWithoutSpecialParams] | null => {
  const { aggParams } = agg;
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

    return [
      {
        operationType: Operations.CUMULATIVE_SUM,
        references: [subMetric?.columnId],
        ...createColumn(agg),
        params: {},
      },
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
