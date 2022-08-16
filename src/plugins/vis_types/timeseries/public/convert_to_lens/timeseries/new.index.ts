/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Layer, NavigateToLensContext } from '@kbn/visualizations-plugin/common';
import uuid from 'uuid';
import { Panel } from '../../../common/types';
import { getDataViewsStart } from '../../services';
import { getDataSourceInfo } from '../lib/datasource';
import { getColumns } from '../lib/series/new.columns';

export const convertToLens = async (model: Panel): Promise<NavigateToLensContext | null> => {
  const dataViews = getDataViewsStart();
  const columns = [];
  const layers: Record<number, Layer> = {};
  // handle multiple layers/series
  for (let layerIdx = 0; layerIdx < model.series.length; layerIdx++) {
    const series = model.series[layerIdx];
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
    const seriesColumns = getColumns(series, indexPattern!);
    if (!seriesColumns) {
      return null;
    }

    columns.push(...seriesColumns);
    const layerId = uuid();
    layers[layerIdx] = { indexPatternId, layerId, columns, columnOrder: [] }; // TODO: update later.
  }

  return {
    layers,
    type: 'lnsXY',
    configuration: {},
  };
};
