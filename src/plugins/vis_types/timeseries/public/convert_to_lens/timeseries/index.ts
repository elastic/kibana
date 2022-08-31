/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { VisualizeEditorLayersContext } from '@kbn/visualizations-plugin/public';
import { PANEL_TYPES } from '../../../common/enums';
import { getDataViewsStart } from '../../services';
import { getDataSourceInfo } from '../lib/datasource';
import { getSeries } from '../lib/series';
import { getFieldsForTerms } from '../../../common/fields_utils';
import { ConvertTsvbToLensVisualization } from '../types';
import { convertChartType, getYExtents } from '../lib/xy';
import { getLayerConfiguration } from '../lib/layers';
import { isSplitWithDateHistogram } from '../lib/split_chart';
import { isValidMetrics } from '../lib/metrics';

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

    if (!isValidMetrics(layer.metrics, PANEL_TYPES.TIMESERIES)) {
      return null;
    }

    const { indexPatternId, timeField } = await getDataSourceInfo(
      model.index_pattern,
      model.time_field,
      Boolean(layer.override_index_pattern),
      layer.series_index_pattern,
      dataViews
    );

    // handle multiple metrics
    const series = getSeries(layer.metrics, seriesNum, layer.split_mode, layer.color);
    if (!series || !series.metrics) {
      return null;
    }

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

    const chartType = convertChartType(layer);

    layersConfiguration[layerIdx] = getLayerConfiguration(
      indexPatternId,
      layerIdx,
      chartType,
      model,
      series,
      splitFields,
      timeField,
      'date_histogram',
      splitWithDateHistogram
    );
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
