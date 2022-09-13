/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Metric, MetricType } from '../../../../common/types';
import { getFormulaEquivalent } from './metrics_helpers';
import { SUPPORTED_METRICS } from './supported_metrics';

export const getSiblingPipelineSeriesFormula = (
  aggregation: MetricType,
  currentMetric: Metric,
  metrics: Metric[],
  window?: string
) => {
  const [nestedFieldId, nestedMeta] = currentMetric.field?.split('[') ?? [];
  const subFunctionMetric = metrics.find((metric) => metric.id === nestedFieldId);
  if (!subFunctionMetric || subFunctionMetric.type === 'static') {
    return null;
  }
  const pipelineAggMap = SUPPORTED_METRICS[subFunctionMetric.type];
  if (!pipelineAggMap) {
    return null;
  }
  const aggregationMap = SUPPORTED_METRICS[aggregation];
  const subMetricField = subFunctionMetric.type !== 'count' ? subFunctionMetric.field : '';
  // support nested aggs with formula
  const additionalSubFunction = metrics.find((metric) => metric.id === subMetricField);
  let formula = `${aggregationMap.name}(`;
  let minimumValue = '';
  if (currentMetric.type === 'positive_only') {
    minimumValue = `, 0`;
  }
  if (additionalSubFunction) {
    const additionalPipelineAggMap = SUPPORTED_METRICS[additionalSubFunction.type];
    if (!additionalPipelineAggMap) {
      return null;
    }
    const additionalSubFunctionField =
      additionalSubFunction.type !== 'count' ? additionalSubFunction.field : '';
    formula += `${pipelineAggMap.name}(${additionalPipelineAggMap.name}(${
      additionalSubFunctionField ?? ''
    }))${minimumValue})`;
  } else {
    const nestedMetaValue = Number(nestedMeta?.replace(']', ''));

    const subFormula = getFormulaEquivalent(subFunctionMetric, metrics, nestedMetaValue, window);

    if (!subFormula) {
      return null;
    }

    formula += `${subFormula}${minimumValue})`;
  }
  return formula;
};
