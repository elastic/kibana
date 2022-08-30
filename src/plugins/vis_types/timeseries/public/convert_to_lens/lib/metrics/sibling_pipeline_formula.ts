/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Metric, MetricType } from '../../../../common/types';
import { getFormulaFromMetric, SUPPORTED_METRICS } from './supported_metrics';
import { getFormulaEquivalent } from './metrics_helpers';

export const getSiblingPipelineSeriesFormula = (
  aggregation: MetricType,
  currentMetric: Metric,
  metrics: Metric[],
  reducedTimeRange?: string
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
  const pipelineAggFormula = getFormulaFromMetric(pipelineAggMap);

  const aggregationMap = SUPPORTED_METRICS[aggregation];
  if (!aggregationMap) {
    return null;
  }
  const aggFormula = getFormulaFromMetric(aggregationMap);

  const subMetricField = subFunctionMetric.type !== 'count' ? subFunctionMetric.field : '';
  // support nested aggs with formula
  const additionalSubFunction = metrics.find((metric) => metric.id === subMetricField);
  let formula = `${aggFormula}(`;
  let minimumValue = '';
  if (currentMetric.type === 'positive_only') {
    minimumValue = `, 0`;
  }
  if (additionalSubFunction) {
    const additionalPipelineAggMap = SUPPORTED_METRICS[additionalSubFunction.type];
    if (!additionalPipelineAggMap) {
      return null;
    }
    const additionalPipelineAggFormula = getFormulaFromMetric(additionalPipelineAggMap);

    const additionalSubFunctionField =
      additionalSubFunction.type !== 'count' ? additionalSubFunction.field : '';
    formula += `${pipelineAggFormula}(${additionalPipelineAggFormula}(${
      additionalSubFunctionField ?? ''
    }))${minimumValue})`;
  } else {
    const nestedMetaValue = Number(nestedMeta?.replace(']', ''));

    const subFormula = getFormulaEquivalent(subFunctionMetric, metrics, {
      metaValue: nestedMetaValue,
      reducedTimeRange,
    });

    if (!subFormula) {
      return null;
    }

    formula += `${subFormula}${minimumValue})`;
  }
  return formula;
};
