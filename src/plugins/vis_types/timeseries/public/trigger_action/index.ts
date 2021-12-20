/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { PaletteOutput } from '../../../../charts/public';
import type { NavigateToLensOptions, LayersSettings } from '../../../../visualizations/public';
import type { Panel } from '../../common/types';
import { PANEL_TYPES } from '../../common/enums';
import { getDataSourceInfo } from './get_datasource_info';
import { getSeries } from './get_series';

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
  const options: { [key: string]: LayersSettings } = {};

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
    const chartType = layer.chart_type === 'line' && layer.fill !== '0' ? 'area' : layer.chart_type;
    if (!indexPatternId) {
      return null;
    }

    // handle multiple metrics
    let metricsArray = getSeries(layer.metrics, layer.color);
    if (!metricsArray) {
      return null;
    }

    if (timeShift) {
      metricsArray = metricsArray.map((metric) => {
        return {
          ...metric,
          params: {
            ...metric.params,
            shift: timeShift,
          },
        };
      });
    }

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
      timeInterval: model.interval || 'auto',
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
