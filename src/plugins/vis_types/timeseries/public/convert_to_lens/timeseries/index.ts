/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PaletteOutput } from '@kbn/coloring';
import { VisualizeEditorLayersContext } from '@kbn/visualizations-plugin/public';
import { getDataViewsStart } from '../../services';
import { getDataSourceInfo } from '../lib/datasource';
import { getSeries } from '../lib/series';
import { SUPPORTED_FORMATTERS } from '../lib/formatters';
import { getFieldsForTerms } from '../../../common/fields_utils';
import { ConvertTsvbToLensVisualization } from '../types';
import {
  convertChartType,
  convertFilter,
  convertMetrics,
  convertSplitFilters,
  getYExtents,
  isSplitWithDateHistogram,
} from '../lib/xy';

export const convertToLens: ConvertTsvbToLensVisualization = async (model) => {
  const layersConfiguration: { [key: string]: VisualizeEditorLayersContext } = {};

  // get the active series number
  const seriesNum = model.series.filter((series) => !series.hidden).length;
  const dataViews = getDataViewsStart();

  // handle multiple layers/series
  for (let layerIdx = 0; layerIdx < model.series.length; layerIdx++) {
    const layer = model.series[layerIdx];
    if (layer.hidden) {
      continue;
    }

    const { indexPatternId, timeField } = await getDataSourceInfo(
      model.index_pattern,
      model.time_field,
      Boolean(layer.override_index_pattern),
      layer.series_index_pattern,
      dataViews
    );

    // handle multiple metrics
    const series = getSeries(layer.metrics, seriesNum);
    if (!series) {
      return null;
    }
    const { metrics: metricsArray, seriesAgg } = series;
    const filter = convertFilter(layer);
    const metrics = convertMetrics(layer, metricsArray, filter);
    const splitFilters = convertSplitFilters(layer);
    const palette = layer.palette as PaletteOutput;
    const splitFields = getFieldsForTerms(layer.terms_field);

    // in case of terms in a date field, we want to apply the date_histogram
    const splitWithDateHistogram = await isSplitWithDateHistogram(
      layer,
      splitFields,
      indexPatternId,
      dataViews
    );

    if (splitWithDateHistogram === null) {
      return null;
    }

    const layerConfiguration: VisualizeEditorLayersContext = {
      indexPatternId,
      timeFieldName: timeField,
      chartType: convertChartType(layer),
      axisPosition: layer.separate_axis ? layer.axis_position : model.axis_position,
      ...(layer.terms_field && { splitFields }),
      splitWithDateHistogram,
      ...(layer.split_mode !== 'everything' && { splitMode: layer.split_mode }),
      ...(splitFilters.length > 0 && { splitFilters }),
      // for non supported palettes, we will use the default palette
      palette:
        !palette || palette.name === 'gradient' || palette.name === 'rainbow'
          ? { name: 'default', type: 'palette' }
          : palette,
      ...(layer.split_mode === 'terms' && {
        termsParams: {
          size: layer.terms_size ?? 10,
          ...(layer.terms_include && { include: [layer.terms_include] }),
          includeIsRegex: Boolean(layer.terms_include),
          ...(layer.terms_exclude && { exclude: [layer.terms_exclude] }),
          excludeIsRegex: Boolean(layer.terms_exclude),
          otherBucket: false,
          orderDirection: layer.terms_direction ?? 'desc',
          orderBy: layer.terms_order_by === '_key' ? { type: 'alphabetical' } : { type: 'column' },
          parentFormat: { id: 'terms' },
        },
      }),
      collapseFn: seriesAgg,
      metrics,
      timeInterval: model.interval && !model.interval?.includes('=') ? model.interval : 'auto',
      ...(SUPPORTED_FORMATTERS.includes(layer.formatter) && { format: layer.formatter }),
      ...(layer.label && { label: layer.label }),
      dropPartialBuckets: layer.override_index_pattern
        ? layer.series_drop_last_bucket > 0
        : model.drop_last_bucket > 0,
    };
    layersConfiguration[layerIdx] = layerConfiguration;
  }

  const extents = getYExtents(model);

  return {
    layers: layersConfiguration,
    type: 'lnsXY',
    configuration: {
      fill: model.series[0].fill ?? 0.3,
      legend: {
        isVisible: Boolean(model.show_legend),
        showSingleSeries: Boolean(model.show_legend),
        position: model.legend_position ?? 'right',
        shouldTruncate: Boolean(model.truncate_legend),
        maxLines: model.max_lines_legend ?? 1,
      },
      gridLinesVisibility: {
        x: Boolean(model.show_grid),
        yLeft: Boolean(model.show_grid),
        yRight: Boolean(model.show_grid),
      },
      extents,
    },
  };
};
