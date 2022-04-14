/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { PaletteOutput } from '@kbn/coloring';
import type {
  NavigateToLensContext,
  VisualizeEditorLayersContext,
} from '../../../../visualizations/public';
import type { Panel } from '../../common/types';
import { PANEL_TYPES } from '../../common/enums';
import { getDataSourceInfo } from './get_datasource_info';
import { getFieldType } from './get_field_type';
import { getSeries } from './get_series';
import { getYExtents } from './get_extents';
import { getFieldsForTerms } from '../../common/fields_utils';

const SUPPORTED_FORMATTERS = ['bytes', 'percent', 'number'];

/*
 * This function is used to convert the TSVB model to compatible Lens model.
 * Returns the Lens model, only if it is supported. If not, it returns null.
 * In case of null, the menu item is disabled and the user can't navigate to Lens.
 */
export const triggerTSVBtoLensConfiguration = async (
  model: Panel
): Promise<NavigateToLensContext | null> => {
  // Disables the option for not timeseries charts, for the string mode and for series with annotations
  if (
    model.type !== PANEL_TYPES.TIMESERIES ||
    !model.use_kibana_indexes ||
    (model.annotations && model.annotations.length > 0)
  ) {
    return null;
  }
  const layersConfiguration: { [key: string]: VisualizeEditorLayersContext } = {};
  // get the active series number
  let seriesNum = 0;
  model.series.forEach((series) => {
    if (!series.hidden) seriesNum++;
  });

  // handle multiple layers/series
  for (let layerIdx = 0; layerIdx < model.series.length; layerIdx++) {
    const layer = model.series[layerIdx];
    if (layer.hidden) continue;

    const { indexPatternId, timeField } = await getDataSourceInfo(
      model.index_pattern,
      model.time_field,
      Boolean(layer.override_index_pattern),
      layer.series_index_pattern
    );

    const timeShift = layer.offset_time;
    // translate to Lens seriesType
    const layerChartType =
      layer.chart_type === 'line' && Number(layer.fill) > 0 ? 'area' : layer.chart_type;
    let chartType = layerChartType;

    if (layer.stacked !== 'none' && layer.stacked !== 'percent') {
      chartType = layerChartType !== 'line' ? `${layerChartType}_stacked` : 'line';
    }
    if (layer.stacked === 'percent') {
      chartType = layerChartType !== 'line' ? `${layerChartType}_percentage_stacked` : 'line';
    }

    // handle multiple metrics
    let metricsArray = getSeries(layer.metrics, seriesNum);
    if (!metricsArray) {
      return null;
    }
    let filter: {
      kql?: string | { [key: string]: any } | undefined;
      lucene?: string | { [key: string]: any } | undefined;
    };
    if (layer.filter) {
      if (layer.filter.language === 'kuery') {
        filter = { kql: layer.filter.query };
      } else if (layer.filter.language === 'lucene') {
        filter = { lucene: layer.filter.query };
      }
    }

    metricsArray = metricsArray.map((metric) => {
      return {
        ...metric,
        color: metric.color ?? layer.color,
        params: {
          ...metric.params,
          ...(timeShift && { shift: timeShift }),
          ...(filter && filter),
        },
      };
    });
    const splitFilters: VisualizeEditorLayersContext['splitFilters'] = [];
    if (layer.split_mode === 'filter' && layer.filter) {
      splitFilters.push({ filter: layer.filter });
    }
    if (layer.split_filters) {
      splitFilters.push(...layer.split_filters);
    }

    const palette = layer.palette as PaletteOutput;
    const splitFields = getFieldsForTerms(layer.terms_field);

    // in case of terms in a date field, we want to apply the date_histogram
    let splitWithDateHistogram = false;
    if (layer.terms_field && layer.split_mode === 'terms' && splitFields) {
      for (const f of splitFields) {
        const fieldType = await getFieldType(indexPatternId, f);

        if (fieldType === 'date') {
          if (splitFields.length === 1) {
            splitWithDateHistogram = true;
          } else {
            return null;
          }
        }
      }
    }

    const layerConfiguration: VisualizeEditorLayersContext = {
      indexPatternId,
      timeFieldName: timeField,
      chartType,
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
          otherBucket: false,
          orderDirection: layer.terms_direction ?? 'desc',
          orderBy: layer.terms_order_by === '_key' ? { type: 'alphabetical' } : { type: 'column' },
          parentFormat: { id: 'terms' },
        },
      }),
      metrics: [...metricsArray],
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
