/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { VisualizeEditorContext } from '../../../../../../ui_actions/public';
import {
  fetchIndexPattern,
  isStringTypeIndexPattern,
} from '../../../../common/index_patterns_utils';
import { PaletteOutput } from '../../../../../../charts/public';
import type { Panel } from '../../../../common/types';
import { getDataStart } from '../../../services';

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
  count: {
    name: 'count',
    isFullReference: false,
  },
  positive_rate: {
    name: 'counter_rate',
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

export const triggerVisualizeToLensActions = async (model: Panel) => {
  const { dataViews } = getDataStart();
  const options: { [key: string]: VisualizeEditorContext } = {};
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
    const aggregation = layer.metrics[metricIdx].type;
    const fieldName = layer.metrics[metricIdx].field;
    // translate to Lens seriesType
    const chartType = layer.chart_type === 'line' && layer.fill !== '0' ? 'area' : layer.chart_type;
    // find supported aggregations
    const aggregationMap = LENS_METRIC_TYPES[aggregation];
    if (!aggregationMap || !indexPatternId) {
      return null;
    }

    // handle multiple metrics
    let metricsArray: VisualizeEditorContext['metrics'] = [];

    if (aggregation === 'percentile' && layer.metrics[metricIdx].percentiles) {
      layer.metrics[metricIdx].percentiles?.forEach((percentile) => {
        metricsArray.push({
          agg: 'percentile',
          isFullReference: false,
          color: percentile.color,
          fieldName: fieldName ?? 'document',
          params: { percentile: percentile.value },
        });
      });
    } else if (aggregation === 'math') {
      let finalScript = layer.metrics[metricIdx].script;
      const variables = layer.metrics[metricIdx].variables;
      if (!variables) {
        return null;
      }
      // create the script
      for (let layerMetricIdx = 0; layerMetricIdx < layer.metrics.length - 1; layerMetricIdx++) {
        const currentMetric = layer.metrics[layerMetricIdx];
        finalScript = finalScript?.replace(
          `params.${variables[layerMetricIdx].name}`,
          `${LENS_METRIC_TYPES[currentMetric.type].name}(${currentMetric.field})`
        );
      }
      metricsArray = [
        {
          agg: 'formula',
          isFullReference: true,
          color: layer.color,
          fieldName: 'document',
          params: { formula: finalScript },
        },
      ];
    } else {
      // construct metrics from the last series.metric item
      metricsArray = [
        {
          agg: aggregationMap.name,
          isFullReference: aggregationMap.isFullReference,
          color: layer.color,
          fieldName: aggregation !== 'count' && fieldName ? fieldName : 'document',
        },
      ];
    }

    const triggerOptions: VisualizeEditorContext = {
      indexPatternId,
      timeFieldName: timeField,
      chartType: layer.stacked === 'none' ? chartType : `${chartType}_stacked`,
      splitField: layer.terms_field ?? undefined,
      splitMode: layer.split_mode !== 'everything' ? layer.split_mode : undefined,
      splitFilters: layer.split_filters ?? undefined,
      palette: (layer.palette as PaletteOutput) ?? undefined,
      ...(layer.split_mode === 'terms' && {
        termsParams: { size: layer.terms_size ?? 10, otherBucket: false },
      }),
      metrics: [...metricsArray],
    };
    options[layerIdx] = triggerOptions;
  }
  return options;
};
