/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Position } from '@elastic/charts';
import {
  Layer,
  NavigateToLensContext,
  XYConfiguration,
} from '@kbn/visualizations-plugin/common/convert_to_lens';
import uuid from 'uuid';
import { Panel } from '../../../common/types';
import { getDataViewsStart } from '../../services';
import { getDataSourceInfo } from '../lib/datasource';
import { getMetricsColumns, getFiltersOrTermColumns } from '../lib/series';
import { getLayers, getYExtents } from '../lib/configurations/xy';

export const convertToLens = async (
  model: Panel
): Promise<NavigateToLensContext<XYConfiguration> | null> => {
  const dataViews = getDataViewsStart();
  const columns = [];
  const layers: Record<number, Layer> = {};
  const seriesNum = model.series.filter((series) => !series.hidden).length;

  // handle multiple layers/series
  for (const [layerIdx, series] of model.series.entries()) {
    if (series.hidden) {
      continue;
    }

    const { indexPatternId, indexPattern } = await getDataSourceInfo(
      model.index_pattern,
      model.time_field,
      Boolean(series.override_index_pattern),
      series.series_index_pattern,
      dataViews
    );

    // handle multiple metrics
    const metricsColumns = getMetricsColumns(series, indexPattern!, seriesNum);
    if (!metricsColumns) {
      return null;
    }

    columns.push(...metricsColumns);

    const filtersOrTermColumns = getFiltersOrTermColumns(series);
    if (filtersOrTermColumns === null) {
      return null;
    }

    columns.push(...filtersOrTermColumns);

    const layerId = uuid();
    layers[layerIdx] = { indexPatternId, layerId, columns, columnOrder: [] }; // TODO: update later.
  }

  const extents = getYExtents(model);

  return {
    layers,
    type: 'lnsXY',
    configuration: {
      layers: getLayers(layers, model),
      fillOpacity: Number(model.series[0].fill) ?? 0.3,
      legend: {
        isVisible: Boolean(model.show_legend),
        showSingleSeries: Boolean(model.show_legend),
        position: (model.legend_position as Position) ?? Position.Right,
        shouldTruncate: Boolean(model.truncate_legend),
        maxLines: model.max_lines_legend ?? 1,
      },
      gridlinesVisibilitySettings: {
        x: Boolean(model.show_grid),
        yLeft: Boolean(model.show_grid),
        yRight: Boolean(model.show_grid),
      },
      yLeftExtent: extents.yLeftExtent,
      yRightExtent: extents.yRightExtent,
    },
  };
};
