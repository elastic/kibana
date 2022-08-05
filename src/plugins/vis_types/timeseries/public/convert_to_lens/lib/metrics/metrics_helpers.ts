/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Metric } from '../../../../common/types';
import { SUPPORTED_METRICS } from './supported_metrics';
import { getFilterRatioFormula } from './filter_ratio_formula';
import { getParentPipelineSeriesFormula } from './parent_pipeline_formula';
import { getSiblingPipelineSeriesFormula } from './sibling_pipeline_formula';

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

export const getPercentileRankSeries = (
  values: Metric['values'],
  colors: Metric['colors'],
  fieldName?: string
) => {
  return values?.map((value, index) => {
    return {
      agg: 'percentile_rank',
      isFullReference: false,
      color: colors?.[index],
      fieldName: fieldName ?? 'document',
      params: { value },
    };
  });
};

export const getTimeScale = (metric: Metric) => {
  const supportedTimeScales = ['1s', '1m', '1h', '1d'];
  let timeScale;
  if (metric.unit && supportedTimeScales.includes(metric.unit)) {
    timeScale = metric.unit.replace('1', '');
  }
  return timeScale;
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
    case 'percentile_rank': {
      return `${aggregation}(${currentMetric.field}${metaValue ? `, value=${metaValue}` : ''})`;
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
