/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Metric, MetricType } from '../../../../common/types';
import { SUPPORTED_METRICS } from './supported_metrics';
import { getFilterRatioFormula } from './filter_ratio_formula';

export const getParentPipelineSeriesFormula = (
  metrics: Metric[],
  subFunctionMetric: Metric,
  pipelineAgg: string,
  aggregation: MetricType,
  percentileValue?: number
) => {
  let formula = '';
  const aggregationMap = SUPPORTED_METRICS[aggregation];
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
    const nestedMetaValue = Number(nestedMeta?.replace(']', ''));
    const aggMap = SUPPORTED_METRICS[aggregation];
    let additionalFunctionArgs;
    if (additionalPipelineAggMap.name === 'percentile' && nestedMetaValue) {
      additionalFunctionArgs = `, percentile=${nestedMetaValue}`;
    }
    if (additionalPipelineAggMap.name === 'percentile_rank' && nestedMetaValue) {
      additionalFunctionArgs = `, value=${nestedMetaValue}`;
    }
    formula = `${aggMap.name}(${pipelineAgg}(${additionalPipelineAggMap.name}(${
      additionalSubFunction.field ?? ''
    }${additionalFunctionArgs ?? ''})))`;
  } else {
    let additionalFunctionArgs;
    if (pipelineAgg === 'percentile' && percentileValue) {
      additionalFunctionArgs = `, percentile=${percentileValue}`;
    }
    if (pipelineAgg === 'percentile_rank' && percentileValue) {
      additionalFunctionArgs = `, value=${percentileValue}`;
    }
    if (pipelineAgg === 'filter_ratio') {
      const script = getFilterRatioFormula(subFunctionMetric);
      if (!script) {
        return null;
      }
      formula = `${aggregationMap.name}(${script}${additionalFunctionArgs ?? ''})`;
    } else if (pipelineAgg === 'counter_rate') {
      formula = `${aggregationMap.name}(${pipelineAgg}(max(${subFunctionMetric.field}${
        additionalFunctionArgs ? `${additionalFunctionArgs}` : ''
      })))`;
    } else {
      formula = `${aggregationMap.name}(${pipelineAgg}(${subFunctionMetric.field}${
        additionalFunctionArgs ? `${additionalFunctionArgs}` : ''
      }))`;
    }
  }
  return formula;
};
