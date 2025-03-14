/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  getConvertToLensModule,
  getDataViewByIndexPatternId,
} from '@kbn/visualizations-plugin/public';
import { excludeMetaFromColumn } from '@kbn/visualizations-plugin/common/convert_to_lens';
import { v4 as uuidv4 } from 'uuid';
import { getDataViewsStart } from '../services';
import { getConfiguration } from './configurations';
import { ConvertHeatmapToLensVisualization } from './types';

export const convertToLens: ConvertHeatmapToLensVisualization = async (vis, timefilter) => {
  if (!timefilter) {
    return null;
  }

  const dataViews = getDataViewsStart();
  const dataView = await getDataViewByIndexPatternId(vis.data.indexPattern?.id, dataViews);

  if (!dataView) {
    return null;
  }

  const { getColumnsFromVis, convertToFiltersColumn } = await getConvertToLensModule();
  const layers = getColumnsFromVis(vis, timefilter, dataView, {
    buckets: ['segment'],
    splits: ['group'],
    unsupported: ['split_row', 'split_column'],
  });

  if (layers === null) {
    return null;
  }

  const [layerConfig] = layers;

  const xColumn = layerConfig.columns.find(({ isBucketed, isSplit }) => isBucketed && !isSplit);
  const xAxisColumn =
    xColumn ??
    convertToFiltersColumn(uuidv4(), { filters: [{ input: { language: 'lucene', query: '*' } }] })!;

  if (xColumn?.columnId !== xAxisColumn?.columnId) {
    layerConfig.buckets.all.push(xAxisColumn.columnId);
    layerConfig.columns.push(xAxisColumn);
  }
  const yColumn = layerConfig.columns.find(({ isBucketed, isSplit }) => isBucketed && isSplit);

  if (!layerConfig.buckets.all.length || layerConfig.metrics.length > 1) {
    return null;
  }

  const layerId = uuidv4();

  const indexPatternId = dataView.id!;
  const configuration = await getConfiguration(layerId, vis, {
    metrics: layerConfig.metrics,
    buckets: [xAxisColumn.columnId, yColumn?.columnId].filter<string>((c): c is string =>
      Boolean(c)
    ),
  });

  return {
    type: 'lnsHeatmap',
    layers: [
      {
        indexPatternId,
        layerId,
        columns: layerConfig.columns.map(excludeMetaFromColumn),
        columnOrder: [],
        ignoreGlobalFilters: false,
      },
    ],
    configuration,
    indexPatternIds: [indexPatternId],
  };
};
