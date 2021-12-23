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
      metaValue
    );
    if (!formula) {
      return null;
    }
    return getFormulaSeries(formula, color);
  } else {
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
    formula = `${aggMap.name}(${pipelineAgg}(${additionalPipelineAggMap.name}(${
      additionalSubFunction.field ?? ''
    }${additionalFunctionArgs ? `${additionalFunctionArgs}` : ''})))`;
  } else {
    let additionalFunctionArgs;
    if (pipelineAgg === 'percentile' && percentileValue) {
      additionalFunctionArgs = `, percentile=${percentileValue}`;
    }
    formula = `${aggregationMap.name}(${pipelineAgg}(${subFunctionMetric.field}${
      additionalFunctionArgs ? `${additionalFunctionArgs}` : ''
    }))`;
    return formula;
  }
};

export const getSiblingPipelineSeriesFormula = (
  aggregation: MetricType,
  currentMetric: Metric,
  metrics: Metric[]
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
  // support nested aggs with formula
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
  return formula;
};

export const getFilterRatioFormula = (currentMetric: Metric) => {
  const { numerator, denominator } = currentMetric;
  return `count(${numerator?.language === 'kuery' ? 'kql' : 'lucene'}='${
    numerator?.query ?? '*'
  }') / count(${denominator?.language === 'kuery' ? 'kql' : 'lucene'}='${
    denominator?.query ?? '*'
  }')`;
};

export const getFormulaEquivalent = (
  currentMetric: Metric,
  metaValue: number,
  metrics: Metric[]
) => {
  const aggregation = SUPPORTED_METRICS[currentMetric.type].name;
  let formula = null;
  switch (currentMetric.type) {
    case 'avg_bucket':
    case 'max_bucket':
    case 'min_bucket':
    case 'sum_bucket': {
      formula = getSiblingPipelineSeriesFormula(currentMetric.type, currentMetric, metrics);
      break;
    }
    case 'count': {
      formula = `${aggregation}()`;
      break;
    }
    case 'percentile': {
      formula = `${aggregation}(${currentMetric.field}${
        metaValue ? `, percentile=${metaValue}` : ''
      })`;
      break;
    }
    case 'cumulative_sum':
    case 'derivative':
    case 'moving_average': {
      const [fieldId, _] = currentMetric?.field?.split('[') ?? [];
      const subFunctionMetric = metrics.find((metric) => metric.id === fieldId);
      if (!subFunctionMetric) {
        return null;
      }
      const pipelineAgg = getPipelineAgg(subFunctionMetric);
      if (!pipelineAgg) {
        return null;
      }
      formula = getParentPipelineSeriesFormula(
        metrics,
        subFunctionMetric,
        pipelineAgg,
        currentMetric.type,
        metaValue
      );
      break;
    }
    case 'positive_rate': {
      formula = `${aggregation}(max(${currentMetric.field}))`;
      break;
    }
    case 'filter_ratio': {
      formula = getFilterRatioFormula(currentMetric);
      break;
    }
    default: {
      formula = `${aggregation}(${currentMetric.field})`;
      break;
    }
  }

  return formula;
};
