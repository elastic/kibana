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
};
//  THINGS TO ADD
//  - multiple metrics
// - formula

export const triggerVisualizeToLensActions = async (model: Panel) => {
  const { dataViews } = getDataStart();
  const options: { [key: string]: VisualizeEditorContext } = {};
  // handle multiple layers/series
  for (let layerIdx = 0; layerIdx < model.series.length; layerIdx++) {
    const layer = model.series[layerIdx];
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
    const aggregation = layer.metrics[0].type;
    const fieldName = layer.metrics[0].field;
    // translate to Lens seriesType
    const chartType = layer.chart_type === 'line' && layer.fill !== '0' ? 'area' : layer.chart_type;
    // find supported aggregations
    const aggregationMap = LENS_METRIC_TYPES[aggregation];
    if (!aggregationMap || !indexPatternId) {
      return null;
    }

    const triggerOptions: VisualizeEditorContext = {
      indexPatternId,
      agg: aggregationMap.name,
      isFullReference: aggregationMap.isFullReference,
      fieldName: aggregation !== 'count' && fieldName ? fieldName : 'document',
      timeFieldName: timeField,
      color: layer.color,
      chartType: layer.stacked === 'none' ? chartType : `${chartType}_stacked`,
      splitField: layer.terms_field ?? undefined,
      splitMode: layer.split_mode !== 'everything' ? layer.split_mode : undefined,
      splitFilters: layer.split_filters ?? undefined,
      palette: (layer.palette as PaletteOutput) ?? undefined,
    };

    if (aggregation === 'percentile' && layer.metrics[0].percentiles) {
      triggerOptions.params = { percentile: layer.metrics[0]?.percentiles[0]?.value };
    }
    if (layer.split_mode === 'terms') {
      triggerOptions.params = { size: layer.terms_size ?? 10, otherBucket: false };
    }
    options[layerIdx] = triggerOptions;
  }
  return options;
};
