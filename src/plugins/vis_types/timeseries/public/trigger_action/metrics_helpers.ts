/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { Query } from '@kbn/data-plugin/common';
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

export const getFormulaSeries = (script: string) => {
  return [
    {
      agg: 'formula',
      isFullReference: true,
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

export const getTimeScale = (metric: Metric) => {
  const supportedTimeScales = ['1s', '1m', '1h', '1d'];
  let timeScale;
  if (metric.unit && supportedTimeScales.includes(metric.unit)) {
    timeScale = metric.unit.replace('1', '');
  }
  return timeScale;
};

export const computeParentSeries = (
  aggregation: MetricType,
  currentMetric: Metric,
  subFunctionMetric: Metric,
  pipelineAgg: string,
  meta?: number
) => {
  const aggregationMap = SUPPORTED_METRICS[aggregation];
  if (subFunctionMetric.type === 'filter_ratio') {
    const script = getFilterRatioFormula(subFunctionMetric);
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
      },
    },
  ];
};

export const getParentPipelineSeries = (
  aggregation: MetricType,
  currentMetricIdx: number,
  metrics: Metric[]
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
      metaValue
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
    }${additionalFunctionArgs ?? ''})))`;
  } else {
    let additionalFunctionArgs;
    if (pipelineAgg === 'percentile' && percentileValue) {
      additionalFunctionArgs = `, percentile=${percentileValue}`;
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

export const getSiblingPipelineSeriesFormula = (
  aggregation: MetricType,
  currentMetric: Metric,
  metrics: Metric[]
) => {
  const subFunctionMetric = metrics.find((metric) => metric.id === currentMetric.field);
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
  let minMax = '';
  if (additionalSubFunction) {
    const additionalPipelineAggMap = SUPPORTED_METRICS[additionalSubFunction.type];
    if (!additionalPipelineAggMap) {
      return null;
    }
    const additionalSubFunctionField =
      additionalSubFunction.type !== 'count' ? additionalSubFunction.field : '';
    if (currentMetric.type === 'positive_only') {
      minMax = `, 0, ${pipelineAggMap.name}(${additionalPipelineAggMap.name}(${
        additionalSubFunctionField ?? ''
      }))`;
    }
    formula += `${pipelineAggMap.name}(${additionalPipelineAggMap.name}(${
      additionalSubFunctionField ?? ''
    }))${minMax})`;
  } else {
    if (currentMetric.type === 'positive_only') {
      minMax = `, 0, ${pipelineAggMap.name}(${subMetricField ?? ''})`;
    }
    formula += `${pipelineAggMap.name}(${subMetricField ?? ''})${minMax})`;
  }
  return formula;
};

const escapeQuotes = (str: string) => {
  return str?.replace(/'/g, "\\'");
};

const constructFilterRationFormula = (operation: string, metric?: Query) => {
  return `${operation}${metric?.language === 'lucene' ? 'lucene' : 'kql'}='${
    metric?.query && typeof metric?.query === 'string'
      ? escapeQuotes(metric?.query)
      : metric?.query ?? '*'
  }')`;
};

export const getFilterRatioFormula = (currentMetric: Metric) => {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { numerator, denominator, metric_agg, field } = currentMetric;
  let aggregation = SUPPORTED_METRICS.count;
  if (metric_agg) {
    aggregation = SUPPORTED_METRICS[metric_agg];
    if (!aggregation) {
      return null;
    }
  }
  const operation =
    metric_agg && metric_agg !== 'count' ? `${aggregation.name}('${field}',` : 'count(';

  if (aggregation.name === 'counter_rate') {
    const numeratorFormula = constructFilterRationFormula(
      `${aggregation.name}(max('${field}',`,
      numerator
    );
    const denominatorFormula = constructFilterRationFormula(
      `${aggregation.name}(max('${field}',`,
      denominator
    );
    return `${numeratorFormula}) / ${denominatorFormula})`;
  } else {
    const numeratorFormula = constructFilterRationFormula(operation, numerator);
    const denominatorFormula = constructFilterRationFormula(operation, denominator);
    return `${numeratorFormula} / ${denominatorFormula}`;
  }
};

export const getFormulaEquivalent = (
  currentMetric: Metric,
  metrics: Metric[],
  metaValue?: number
) => {
  const aggregation = SUPPORTED_METRICS[currentMetric.type]?.name;
  switch (currentMetric.type) {
    case 'avg_bucket':
    case 'max_bucket':
    case 'min_bucket':
    case 'sum_bucket':
    case 'positive_only': {
      return getSiblingPipelineSeriesFormula(currentMetric.type, currentMetric, metrics);
    }
    case 'count': {
      return `${aggregation}()`;
    }
    case 'percentile': {
      return `${aggregation}(${currentMetric.field}${
        metaValue ? `, percentile=${metaValue}` : ''
      })`;
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
      return getParentPipelineSeriesFormula(
        metrics,
        subFunctionMetric,
        pipelineAgg,
        currentMetric.type,
        metaValue
      );
    }
    case 'positive_rate': {
      return `${aggregation}(max(${currentMetric.field}))`;
    }
    case 'filter_ratio': {
      return getFilterRatioFormula(currentMetric);
    }
    case 'static': {
      return `${currentMetric.value}`;
    }
    default: {
      return `${aggregation}(${currentMetric.field})`;
    }
  }
};
