/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { VisualizeEditorLayersContext } from '../../../../visualizations/public';
import type { Metric } from '../../common/types';
import { SUPPORTED_METRICS } from './supported_metrics';
import {
  getPercentilesSeries,
  getFormulaSeries,
  getParentPipelineSeries,
  getSiblingPipelineSeriesFormula,
  getPipelineAgg,
  computeParentSeries,
  getFormulaEquivalent,
  getParentPipelineSeriesFormula,
  getFilterRatioFormula,
  getTimeScale,
} from './metrics_helpers';

export const getSeries = (metrics: Metric[]): VisualizeEditorLayersContext['metrics'] | null => {
  const metricIdx = metrics.length - 1;
  const aggregation = metrics[metricIdx].type;
  const fieldName = metrics[metricIdx].field;
  const aggregationMap = SUPPORTED_METRICS[aggregation];
  if (!aggregationMap) {
    return null;
  }
  let metricsArray: VisualizeEditorLayersContext['metrics'] = [];
  switch (aggregation) {
    case 'percentile': {
      const percentiles = metrics[metricIdx].percentiles;
      if (percentiles?.length) {
        const percentilesSeries = getPercentilesSeries(
          percentiles,
          fieldName
        ) as VisualizeEditorLayersContext['metrics'];
        metricsArray = [...metricsArray, ...percentilesSeries];
      }
      break;
    }
    case 'math': {
      // find the metric idx that has math expression
      const mathMetricIdx = metrics.findIndex((metric) => metric.type === 'math');
      let finalScript = metrics[mathMetricIdx].script;

      const variables = metrics[mathMetricIdx].variables;
      const layerMetricsArray = metrics;
      if (!finalScript || !variables) return null;

      // create the script
      for (let layerMetricIdx = 0; layerMetricIdx < layerMetricsArray.length; layerMetricIdx++) {
        if (layerMetricsArray[layerMetricIdx].type === 'math') {
          continue;
        }
        const currentMetric = metrics[layerMetricIdx];

        // should treat percentiles differently
        if (currentMetric.type === 'percentile') {
          variables.forEach((variable) => {
            const [_, meta] = variable?.field?.split('[') ?? [];
            const metaValue = Number(meta?.replace(']', ''));
            if (!metaValue) return;
            const script = getFormulaEquivalent(currentMetric, layerMetricsArray, metaValue);
            if (!script) return;
            finalScript = finalScript?.replace(`params.${variable.name}`, script);
          });
        } else {
          const script = getFormulaEquivalent(currentMetric, layerMetricsArray);
          const variable = variables.find((v) => v.field === currentMetric.id);
          if (!script) return null;
          finalScript = finalScript?.replace(`params.${variable?.name}`, script);
        }
      }
      if (finalScript.includes('params')) return null;
      metricsArray = getFormulaSeries(finalScript);
      break;
    }
    case 'moving_average':
    case 'derivative': {
      metricsArray = getParentPipelineSeries(
        aggregation,
        metricIdx,
        metrics
      ) as VisualizeEditorLayersContext['metrics'];
      break;
    }
    case 'cumulative_sum': {
      //  percentile value is derived from the field Id. It has the format xxx-xxx-xxx-xxx[percentile]
      const [fieldId, meta] = metrics[metricIdx]?.field?.split('[') ?? [];
      const subFunctionMetric = metrics.find((metric) => metric.id === fieldId);
      if (!subFunctionMetric) {
        return null;
      }
      const pipelineAgg = getPipelineAgg(subFunctionMetric);
      if (!pipelineAgg) {
        return null;
      }
      // lens supports cumulative sum for count and sum as quick function
      // and everything else as formula
      if (pipelineAgg !== 'count' && pipelineAgg !== 'sum') {
        const metaValue = Number(meta?.replace(']', ''));
        const formula = getParentPipelineSeriesFormula(
          metrics,
          subFunctionMetric,
          pipelineAgg,
          aggregation,
          metaValue
        );
        if (!formula) return null;
        metricsArray = getFormulaSeries(formula);
      } else {
        metricsArray = computeParentSeries(
          aggregation,
          metrics[metricIdx],
          subFunctionMetric,
          pipelineAgg
        );
      }
      break;
    }
    case 'avg_bucket':
    case 'max_bucket':
    case 'min_bucket':
    case 'sum_bucket': {
      const formula = getSiblingPipelineSeriesFormula(aggregation, metrics[metricIdx], metrics);
      if (!formula) {
        return null;
      }
      metricsArray = getFormulaSeries(formula) as VisualizeEditorLayersContext['metrics'];
      break;
    }
    case 'filter_ratio': {
      const formula = getFilterRatioFormula(metrics[metricIdx]);
      metricsArray = getFormulaSeries(formula);
      break;
    }
    default: {
      const timeScale = getTimeScale(metrics[metricIdx]);
      metricsArray = [
        {
          agg: aggregationMap.name,
          isFullReference: aggregationMap.isFullReference,
          fieldName: aggregation !== 'count' && fieldName ? fieldName : 'document',
          params: {
            ...(timeScale && { timeScale }),
          },
        },
      ];
    }
  }
  return metricsArray;
};
