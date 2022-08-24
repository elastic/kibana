/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { VisualizeEditorLayersContext } from '@kbn/visualizations-plugin/public';
import { PaletteOutput } from '@kbn/coloring';
import { SUPPORTED_FORMATTERS } from '../formatters';
import { convertSplitFilters } from '../split_chart';
import { convertMetrics, convertFilter } from '../metrics';
import type { Panel, Series } from '../../../../common/types';
import { VisSeries } from '../series';

function getTermParams(layer: Series) {
  return {
    size: layer.terms_size ?? 10,
    ...(layer.terms_include && { include: [layer.terms_include] }),
    includeIsRegex: Boolean(layer.terms_include),
    ...(layer.terms_exclude && { exclude: [layer.terms_exclude] }),
    excludeIsRegex: Boolean(layer.terms_exclude),
    otherBucket: false,
    orderDirection: layer.terms_direction ?? 'desc',
    orderBy: layer.terms_order_by === '_key' ? { type: 'alphabetical' } : { type: 'column' },
    parentFormat: { id: 'terms' },
  };
}

function getPalette(palette: PaletteOutput): PaletteOutput {
  return !palette || palette.name === 'gradient' || palette.name === 'rainbow'
    ? { name: 'default', type: 'palette' }
    : palette;
}

export const getLayerConfiguration = (
  indexPatternId: string,
  layerIdx: number,
  chartType: string,
  model: Panel,
  series: VisSeries,
  splitFields: string[],
  xFieldName?: string,
  xMode?: string,
  splitWithDateHistogram?: boolean,
  window?: string
): VisualizeEditorLayersContext => {
  const layer = model.series[layerIdx];
  const palette = layer.palette as PaletteOutput;
  const splitFilters = convertSplitFilters(layer);
  const { metrics: metricsArray, seriesAgg } = series;
  const filter = convertFilter(layer);
  const metrics = convertMetrics(layer, metricsArray, filter, window);
  return {
    indexPatternId,
    xFieldName,
    xMode,
    chartType,
    axisPosition: layer.separate_axis ? layer.axis_position : model.axis_position,
    ...(layer.terms_field && { splitFields }),
    splitWithDateHistogram,
    ...(layer.split_mode !== 'everything' && { splitMode: layer.split_mode }),
    ...(splitFilters.length > 0 && { splitFilters }),
    // for non supported palettes, we will use the default palette
    palette: getPalette(palette),
    ...(layer.split_mode === 'terms' && {
      termsParams: getTermParams(layer),
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
};
