/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { PaletteOutput } from '../../../charts/public';
import type { NavigateToLensOptions, LayersSettings } from '../../../visualizations/public';
import { fetchIndexPattern, isStringTypeIndexPattern } from '../common/index_patterns_utils';
import type { Panel } from '../common/types';
import { PANEL_TYPES } from '../common/enums';
import { getDataStart } from './services';

interface AggOptions {
  name: string;
  isFullReference: boolean;
  params?: any;
}

const LENS_METRIC_TYPES: { [key: string]: AggOptions } = {
  avg: {
    name: 'average',
    isFullReference: false,
  },
  cardinality: {
    name: 'unique_count',
    isFullReference: false,
  },
  count: {
    name: 'count',
    isFullReference: false,
  },
  positive_rate: {
    name: 'counter_rate',
    isFullReference: true,
  },
  moving_average: {
    name: 'moving_average',
    isFullReference: true,
  },
  derivative: {
    name: 'differences',
    isFullReference: true,
  },
  cumulative_sum: {
    name: 'cumulative_sum',
    isFullReference: true,
  },
  max: {
    name: 'max',
    isFullReference: false,
  },
  min: {
    name: 'min',
    isFullReference: false,
  },
  percentile: {
    name: 'percentile',
    isFullReference: false,
  },
  sum: {
    name: 'sum',
    isFullReference: false,
  },
  math: {
    name: 'formula',
    isFullReference: true,
  },
};

export const triggerVisualizeToLensActions = async (
  model: Panel
): Promise<NavigateToLensOptions | null> => {
  // For now we will hide the option for not timeseries charts
  if (model.type !== PANEL_TYPES.TIMESERIES) {
    return null;
  }
  const { dataViews } = getDataStart();
  const options: { [key: string]: LayersSettings } = {};
  // handle multiple layers/series
  for (let layerIdx = 0; layerIdx < model.series.length; layerIdx++) {
    const layer = model.series[layerIdx];
    if (layer.hidden) continue;
    let indexPatternId =
      model.index_pattern && !isStringTypeIndexPattern(model.index_pattern)
        ? model.index_pattern.id
        : '';
    let timeField = model.time_field;
    // handle override index pattern
    if (layer.override_index_pattern) {
      const { indexPattern } = await fetchIndexPattern(layer.series_index_pattern, dataViews);
      if (indexPattern) {
        indexPatternId = indexPattern.id ?? '';
        timeField = indexPattern.timeFieldName;
      }
    } else {
      if (!timeField) {
        if (indexPatternId) {
          const indexPattern = await dataViews.get(indexPatternId);
          timeField = indexPattern.timeFieldName;
        } else {
          const defaultIndex = await dataViews.getDefault();
          timeField = defaultIndex?.timeFieldName;
        }
      }
      if (!indexPatternId) {
        const defaultIndex = await dataViews.getDefault();
        indexPatternId = defaultIndex?.id ?? '';
      }
    }
    const metricIdx = layer.metrics.length - 1;
    // find the metric idx that has math expression
    const mathMetricIdx = layer.metrics.findIndex((metric) => metric.type === 'math');
    const aggregation = layer.metrics[mathMetricIdx > 0 ? mathMetricIdx : metricIdx].type;
    const fieldName = layer.metrics[metricIdx].field;
    const timeShift = layer.offset_time;
    // translate to Lens seriesType
    const chartType = layer.chart_type === 'line' && layer.fill !== '0' ? 'area' : layer.chart_type;
    // find supported aggregations
    const aggregationMap = LENS_METRIC_TYPES[aggregation];
    if (!aggregationMap || !indexPatternId) {
      return null;
    }

    // handle multiple metrics
    let metricsArray: LayersSettings['metrics'] = [];

    if (aggregation === 'percentile' && layer.metrics[metricIdx].percentiles) {
      layer.metrics[metricIdx].percentiles?.forEach((percentile) => {
        metricsArray.push({
          agg: 'percentile',
          isFullReference: false,
          color: percentile.color,
          fieldName: fieldName ?? 'document',
          params: { percentile: percentile.value, shift: timeShift },
        });
      });
    } else if (aggregation === 'math') {
      let finalScript = layer.metrics[mathMetricIdx].script;
      const variables = layer.metrics[mathMetricIdx].variables;
      const layerMetricsArray = layer.metrics;
      layerMetricsArray.splice(mathMetricIdx, 1);
      if (!variables) {
        return null;
      }
      // create the script
      for (let layerMetricIdx = 0; layerMetricIdx < layerMetricsArray.length; layerMetricIdx++) {
        const currentMetric = layer.metrics[layerMetricIdx];
        finalScript = finalScript?.replace(
          `params.${variables[layerMetricIdx].name}`,
          `${LENS_METRIC_TYPES[currentMetric.type].name}(${
            currentMetric.type === 'count' ? '' : currentMetric.field
          })`
        );
      }
      metricsArray = [
        {
          agg: 'formula',
          isFullReference: true,
          color: layer.color,
          fieldName: 'document',
          params: { formula: finalScript, shift: timeShift },
        },
      ];
      // improve this
    } else if (aggregation === 'moving_average' || aggregation === 'derivative') {
      const subFunctionMetric = layer.metrics.find(
        (metric) => metric.id === layer.metrics[metricIdx].field
      );
      if (!subFunctionMetric) {
        return null;
      }
      const pipelineAggMap = LENS_METRIC_TYPES[subFunctionMetric.type];
      if (!pipelineAggMap) {
        return null;
      }
      metricsArray = [
        {
          agg: aggregationMap.name,
          isFullReference: aggregationMap.isFullReference,
          pipelineAggType: pipelineAggMap.name,
          color: layer.color,
          fieldName:
            subFunctionMetric?.field && pipelineAggMap.name !== 'count'
              ? subFunctionMetric?.field
              : 'document',
          params: { shift: timeShift, window: layer.metrics[metricIdx].window },
        },
      ];
    } else if (aggregation === 'cumulative_sum') {
      const subFunctionMetric = layer.metrics.find(
        (metric) => metric.id === layer.metrics[metricIdx].field
      );
      if (!subFunctionMetric) {
        return null;
      }
      const pipelineAggMap = LENS_METRIC_TYPES[subFunctionMetric.type];
      if (!pipelineAggMap) {
        return null;
      }
      if (pipelineAggMap.name !== 'count' && pipelineAggMap.name !== 'sum') {
        const script = `${aggregation}(${pipelineAggMap.name}(${subFunctionMetric.field}))`;
        metricsArray = [
          {
            agg: 'formula',
            isFullReference: true,
            color: layer.color,
            fieldName: 'document',
            params: { formula: script, shift: timeShift },
          },
        ];
      } else {
        metricsArray = [
          {
            agg: aggregationMap.name,
            isFullReference: aggregationMap.isFullReference,
            pipelineAggType: pipelineAggMap.name,
            color: layer.color,
            fieldName:
              subFunctionMetric?.field && pipelineAggMap.name !== 'count'
                ? subFunctionMetric?.field
                : 'document',
            params: { shift: timeShift, window: layer.metrics[metricIdx].window },
          },
        ];
      }
    } else {
      // construct metrics from the last series.metric item
      metricsArray = [
        {
          agg: aggregationMap.name,
          isFullReference: aggregationMap.isFullReference,
          color: layer.color,
          fieldName: aggregation !== 'count' && fieldName ? fieldName : 'document',
          params: { shift: timeShift },
        },
      ];
    }
    // console.dir(metricsArray);
    // console.dir(layer);

    const triggerOptions: LayersSettings = {
      indexPatternId,
      timeFieldName: timeField,
      chartType:
        layer.stacked === 'none'
          ? chartType
          : chartType !== 'line'
          ? `${chartType}_stacked`
          : 'line',
      splitField: layer.terms_field ?? undefined,
      splitMode: layer.split_mode !== 'everything' ? layer.split_mode : undefined,
      splitFilters: layer.split_filters ?? undefined,
      palette: (layer.palette as PaletteOutput) ?? undefined,
      ...(layer.split_mode === 'terms' && {
        termsParams: { size: layer.terms_size ?? 10, otherBucket: false },
      }),
      metrics: [...metricsArray],
      timeInterval: model.interval ?? 'auto',
    };
    options[layerIdx] = triggerOptions;
  }
  return {
    layers: options,
    configuration: {
      fill: model.series[0].fill ?? 0.3,
      legend: {
        isVisible: Boolean(model.show_legend) ?? true,
        position: model.legend_position ?? 'right',
        shouldTruncate: Boolean(model.truncate_legend) ?? false,
        maxLines: model.max_lines_legend ?? 1,
      },
      gridLinesVisibility: {
        x: Boolean(model.show_grid) ?? true,
        yLeft: Boolean(model.show_grid) ?? true,
        yRight: Boolean(model.show_grid) ?? true,
      },
    },
  };
};
