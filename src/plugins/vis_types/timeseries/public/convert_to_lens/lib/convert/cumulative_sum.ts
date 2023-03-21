/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { METRIC_TYPES } from '@kbn/data-plugin/public';
import { SUPPORTED_METRICS, getPipelineSeriesFormula } from '../metrics';
import { createFormulaColumn } from './formula';
import { computeParentPipelineColumns } from './parent_pipeline';
import { CommonColumnsConverterArgs } from './types';

export const convertToCumulativeSumColumns = (
  { series, metrics, dataView }: CommonColumnsConverterArgs,
  reducedTimeRange?: string
) => {
  const metric = metrics[metrics.length - 1];

  //  percentile and percentile_rank value is derived from the field Id. It has the format xxx-xxx-xxx-xxx[percentile]
  const [fieldId, meta] = metric?.field?.split('[') ?? [];
  const subFunctionMetric = metrics.find(({ id }) => id === fieldId);
  if (!subFunctionMetric || subFunctionMetric.type === 'static') {
    return null;
  }
  const pipelineAgg = SUPPORTED_METRICS[subFunctionMetric.type];
  if (!pipelineAgg) {
    return null;
  }
  let formula;
  // lens supports cumulative sum for count and sum as quick function
  // and everything else as formula
  if (subFunctionMetric.type !== 'count' && pipelineAgg.name !== 'sum') {
    const metaValue = Number(meta?.replace(']', ''));
    formula = getPipelineSeriesFormula(metric, metrics, subFunctionMetric, {
      metaValue,
      reducedTimeRange,
      timeShift: series.offset_time,
    });
    if (!formula) {
      return null;
    }

    return createFormulaColumn(formula, { series, metric, dataView });
  } else {
    const agg = SUPPORTED_METRICS[METRIC_TYPES.CUMULATIVE_SUM];
    return computeParentPipelineColumns(
      agg.name,
      { series, metric, dataView },
      subFunctionMetric,
      pipelineAgg,
      { reducedTimeRange }
    );
  }
};
