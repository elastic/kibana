/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Metric, MetricType } from '../../../../common/types';
import { SUPPORTED_METRICS } from './supported_metrics';
import { getParentPipelineSeriesFormula } from './parent_pipeline_formula';
import { getFilterRatioFormula } from './filter_ratio_formula';
import { getFormulaSeries, getTimeScale, getPipelineAgg } from './metrics_helpers';

export const computeParentSeries = (
  aggregation: MetricType,
  currentMetric: Metric,
  subFunctionMetric: Metric,
  pipelineAgg: string,
  meta?: number,
  window?: string
) => {
  const aggregationMap = SUPPORTED_METRICS[aggregation];
  if (subFunctionMetric.type === 'filter_ratio') {
    const script = getFilterRatioFormula(subFunctionMetric, window);
    if (!script) {
      return null;
    }
    const formula = `${aggregationMap.name}(${script})`;
    return getFormulaSeries(formula);
  }
  const timeScale = getTimeScale(currentMetric);
  return [
    {
      agg: aggregationMap.name,
      isFullReference: aggregationMap.isFullReference,
      pipelineAggType: pipelineAgg,
      fieldName:
        subFunctionMetric?.field && pipelineAgg !== 'count' ? subFunctionMetric?.field : 'document',
      params: {
        ...(currentMetric.window && { window: currentMetric.window }),
        ...(timeScale && { timeScale }),
        ...(pipelineAgg === 'percentile' && meta && { percentile: meta }),
        ...(pipelineAgg === 'percentile_rank' && meta && { value: meta }),
      },
    },
  ];
};

export const getParentPipelineSeries = (
  aggregation: MetricType,
  currentMetricIdx: number,
  metrics: Metric[],
  window?: string
) => {
  const currentMetric = metrics[currentMetricIdx];
  //  percentile value is derived from the field Id. It has the format xxx-xxx-xxx-xxx[percentile]
  const [fieldId, meta] = currentMetric?.field?.split('[') ?? [];
  const subFunctionMetric = metrics.find((metric) => metric.id === fieldId);
  if (!subFunctionMetric || subFunctionMetric.type === 'static') {
    return null;
  }
  const pipelineAgg = getPipelineAgg(subFunctionMetric);
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
      aggregation,
      metaValue,
      window
    );
    if (!formula) {
      return null;
    }
    return getFormulaSeries(formula);
  } else {
    return computeParentSeries(
      aggregation,
      currentMetric,
      subFunctionMetric,
      pipelineAgg,
      metaValue,
      window
    );
  }
};
