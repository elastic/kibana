/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { Metric, MetricType } from '../../common/types';
import { SUPPORTED_METRICS } from './supported_metrics';

export const getPercentilesSeries = (percentiles: Metric['percentiles'], fieldName?: string) => {
  return percentiles?.map((percentile) => {
    return {
      agg: 'percentile',
      isFullReference: false,
      color: percentile.color,
      fieldName: fieldName ?? 'document',
      params: { percentile: percentile.value },
    };
  });
};

export const getFormulaSeries = (script: string, color: string) => {
  return [
    {
      agg: 'formula',
      isFullReference: true,
      color,
      fieldName: 'document',
      params: { formula: script },
    },
  ];
};

export const getPipelineAgg = (subFunctionMetric: Metric) => {
  const pipelineAggMap = SUPPORTED_METRICS[subFunctionMetric.type];
  if (!pipelineAggMap) {
    return null;
  }
  return pipelineAggMap.name;
};

export const computeParentSeries = (
  aggregation: MetricType,
  currentMetric: Metric,
  subFunctionMetric: Metric,
  pipelineAgg: string,
  color: string,
  meta?: number
) => {
  const aggregationMap = SUPPORTED_METRICS[aggregation];
  return [
    {
      agg: aggregationMap.name,
      isFullReference: aggregationMap.isFullReference,
      pipelineAggType: pipelineAgg,
      color,
      fieldName:
        subFunctionMetric?.field && pipelineAgg !== 'count' ? subFunctionMetric?.field : 'document',
      params: {
        window: currentMetric.window,
        ...(pipelineAgg === 'percentile' && meta && { percentile: meta }),
      },
    },
  ];
};

export const getParentPipelineSeries = (
  aggregation: MetricType,
  currentMetric: Metric,
  metrics: Metric[],
  color: string
) => {
  //  percentile value is derived from the field Id. It has the format xxx-xxx-xxx-xxx[percentile]
  const [fieldId, meta] = currentMetric?.field?.split('[') ?? [];
  const subFunctionMetric = metrics.find((metric) => metric.id === fieldId);
  if (!subFunctionMetric) {
    return null;
  }
  const pipelineAgg = getPipelineAgg(subFunctionMetric);
  if (!pipelineAgg) {
    return null;
  }
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
    const aggregationMap = SUPPORTED_METRICS[aggregation];
    let additionalFunctionArgs;
    if (additionalPipelineAggMap.name === 'percentile' && nestedMetaValue) {
      additionalFunctionArgs = `, percentile=${nestedMetaValue}`;
    }
    const formula = `${aggregationMap.name}(${pipelineAgg}(${additionalPipelineAggMap.name}(${
      additionalSubFunction.field ?? ''
    }${additionalFunctionArgs ? `${additionalFunctionArgs}` : ''})))`;
    return getFormulaSeries(formula, color);
  } else {
    const metaValue = Number(meta?.replace(']', ''));
    return computeParentSeries(
      aggregation,
      currentMetric,
      subFunctionMetric,
      pipelineAgg,
      color,
      metaValue
    );
  }
};

export const getSiblingPipelineSeries = (
  aggregation: MetricType,
  currentMetric: Metric,
  metrics: Metric[],
  color: string
) => {
  const subFunctionMetric = metrics.find((metric) => metric.id === currentMetric.field);
  if (!subFunctionMetric) {
    return null;
  }
  const pipelineAggMap = SUPPORTED_METRICS[subFunctionMetric.type];
  if (!pipelineAggMap) {
    return null;
  }
  const aggregationMap = SUPPORTED_METRICS[aggregation];
  const subMetricField = subFunctionMetric.field;
  // support nested aggs
  const additionalSubFunction = metrics.find((metric) => metric.id === subMetricField);
  let formula = `${aggregationMap.name}(`;
  if (additionalSubFunction) {
    const additionalPipelineAggMap = SUPPORTED_METRICS[additionalSubFunction.type];
    if (!additionalPipelineAggMap) {
      return null;
    }
    formula += `${pipelineAggMap.name}(${additionalPipelineAggMap.name}(${
      additionalSubFunction.field ?? ''
    })))`;
  } else {
    formula += `${pipelineAggMap.name}(${subFunctionMetric.field ?? ''}))`;
  }
  return getFormulaSeries(formula, color);
};
