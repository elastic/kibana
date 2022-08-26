/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { METRIC_TYPES } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { Metric, Series } from '../../../../common/types';
import { SUPPORTED_METRICS, getParentPipelineSeriesFormula } from '../metrics';
import { createFormulaColumn } from './formula';
import { computeParentPipelineColumns } from './parent_pipeline';

export const convertToCumulativeSumColumns = (
  series: Series,
  metrics: Metric[],
  dataView: DataView,
  window?: string
) => {
  const currentMetric = metrics[metrics.length - 1];
  if (!currentMetric) {
    return null;
  }

  //  percentile and percentile_rank value is derived from the field Id. It has the format xxx-xxx-xxx-xxx[percentile]
  const [fieldId, meta] = currentMetric?.field?.split('[') ?? [];
  const subFunctionMetric = metrics.find((metric) => metric.id === fieldId);
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
  if (pipelineAgg.name !== 'count' && pipelineAgg.name !== 'sum') {
    const metaValue = Number(meta?.replace(']', ''));
    formula = getParentPipelineSeriesFormula(
      metrics,
      subFunctionMetric,
      pipelineAgg,
      currentMetric.type,
      { metaValue, window }
    );
    if (!formula) {
      return null;
    }

    return createFormulaColumn(formula, series, currentMetric);
  } else {
    const agg = SUPPORTED_METRICS[METRIC_TYPES.CUMULATIVE_SUM];
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
      { window }
    );
  }
};
