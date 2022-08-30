/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Metric, MetricType } from '../../../../common/types';
import { SUPPORTED_METRICS, getFormulaFromMetric, SupportedMetric } from './supported_metrics';
import { getFormulaEquivalent } from './metrics_helpers';

export const getParentPipelineSeriesFormula = (
  metrics: Metric[],
  subFunctionMetric: Metric,
  pipelineAgg: SupportedMetric,
  aggregation: MetricType,
  { metaValue, reducedTimeRange }: { metaValue?: number; reducedTimeRange?: string } = {}
) => {
  let formula = '';
  const aggregationMap = SUPPORTED_METRICS[aggregation];
  if (!aggregationMap) {
    return null;
  }
  if (subFunctionMetric.type === 'static') {
    return null;
  }

  const aggFormula = getFormulaFromMetric(aggregationMap);
  const pipelineFormula = getFormulaFromMetric(pipelineAgg);

  const subMetricField = subFunctionMetric.field;
  const [nestedFieldId, nestedMeta] = subMetricField?.split('[') ?? [];
  // support nested aggs
  const additionalSubFunction = metrics.find((metric) => metric.id === nestedFieldId);
  if (additionalSubFunction) {
    // support nested aggs with formula
    const additionalPipelineAggMap = SUPPORTED_METRICS[additionalSubFunction.type];
    if (!additionalPipelineAggMap) {
      return null;
    }
    const additionalPipelineAggFormula = getFormulaFromMetric(additionalPipelineAggMap);

    const nestedMetaValue = Number(nestedMeta?.replace(']', ''));
    let additionalFunctionArgs;
    if (additionalPipelineAggMap.name === 'percentile' && nestedMetaValue) {
      additionalFunctionArgs = `, percentile=${nestedMetaValue}`;
    }
    if (additionalPipelineAggMap.name === 'percentile_rank' && nestedMetaValue) {
      additionalFunctionArgs = `, value=${nestedMetaValue}`;
    }
    formula = `${aggFormula}(${pipelineFormula}(${additionalPipelineAggFormula}(${
      additionalSubFunction.field ?? ''
    }${additionalFunctionArgs ?? ''})))`;
  } else {
    const subFormula = getFormulaEquivalent(subFunctionMetric, metrics, {
      metaValue,
      reducedTimeRange,
    });

    if (!subFormula) {
      return null;
    }

    formula = `${aggregationMap.name}(${subFormula})`;
  }
  return formula;
};
