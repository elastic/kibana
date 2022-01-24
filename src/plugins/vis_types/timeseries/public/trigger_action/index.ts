/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { PaletteOutput } from '../../../../charts/public';
import type {
  NavigateToLensOptions,
  VisualizeEditorLayersContext,
} from '../../../../visualizations/public';
import type { Panel } from '../../common/types';
import { PANEL_TYPES } from '../../common/enums';
import { getDataSourceInfo } from './get_datasource_info';
import { getSeries } from './get_series';
import { getYExtents } from './get_extents';

const SUPPORTED_FORMATTERS = ['bytes', 'percent', 'number'];

/*
 * This function is used to convert the TSVB model to compatible Lens model.
 * Returns the Lens model, only if it is supported. If not, it returns null.
 * In case of null, the menu item is disabled and the user can't navigate to Lens.
 */
export const triggerVisualizeToLensOptions = async (
  model: Panel
): Promise<NavigateToLensOptions | null> => {
  // For now we will disable the option for not timeseries charts and for the string mode
  if (model.type !== PANEL_TYPES.TIMESERIES || !model.use_kibana_indexes) {
    return null;
  }
  const options: { [key: string]: VisualizeEditorLayersContext } = {};

  // handle multiple layers/series
  for (let layerIdx = 0; layerIdx < model.series.length; layerIdx++) {
    const layer = model.series[layerIdx];
    if (layer.hidden) continue;

    const { indexPatternId, timeField } = await getDataSourceInfo(
      model.index_pattern,
      model.time_field,
      Boolean(layer.override_index_pattern) ? layer.series_index_pattern : undefined
    );

    const timeShift = layer.offset_time;
    // translate to Lens seriesType
    const chartType = layer.chart_type === 'line' && layer.fill !== '0' ? 'area' : layer.chart_type;

    // handle multiple metrics
    let metricsArray = getSeries(layer.metrics);
    if (!metricsArray) {
      return null;
    }

    metricsArray = metricsArray.map((metric) => {
      return {
        ...metric,
        color: metric.color ?? layer.color,
        params: {
          ...metric.params,
          ...(timeShift && { shift: timeShift }),
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

    const triggerOptions: VisualizeEditorLayersContext = {
      indexPatternId,
      timeFieldName: timeField,
      chartType:
        layer.stacked === 'none'
          ? chartType
          : chartType !== 'line'
          ? `${chartType}_stacked`
          : 'line',
      axisPosition: layer.separate_axis ? layer.axis_position : model.axis_position,
      splitField: layer.terms_field ?? undefined,
      splitMode: layer.split_mode !== 'everything' ? layer.split_mode : undefined,
      splitFilters: splitFilters.length > 0 ? splitFilters : undefined,
      palette: (layer.palette as PaletteOutput) ?? undefined,
      ...(layer.split_mode === 'terms' && {
        termsParams: {
          size: layer.terms_size ?? 10,
          otherBucket: false,
          orderDirection: layer.terms_direction,
          orderBy:
            layer.terms_order_by === '_key'
              ? { type: 'alphabetical', fallback: true }
              : { type: 'column' },
        },
      }),
      metrics: [...metricsArray],
      timeInterval: model.interval || 'auto',
      format: SUPPORTED_FORMATTERS.includes(layer.formatter) ? layer.formatter : undefined,
      ...(layer.label && { label: layer.label }),
    };
    options[layerIdx] = triggerOptions;
  }

  const extents = getYExtents(model);

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
      extents,
    },
  };
};
