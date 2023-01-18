/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { v4 as uuidv4 } from 'uuid';
import { Column, ColumnWithMeta } from '@kbn/visualizations-plugin/common';
import {
  convertToLensModule,
  getDataViewByIndexPatternId,
} from '@kbn/visualizations-plugin/public';
import { getDataViewsStart } from '../services';
import { ConvertMetricVisToLensVisualization } from './types';

export const isColumnWithMeta = (column: Column): column is ColumnWithMeta => {
  if ((column as ColumnWithMeta).meta) {
    return true;
  }
  return false;
};

export const excludeMetaFromColumn = (column: Column) => {
  if (isColumnWithMeta(column)) {
    const { meta, ...rest } = column;
    return rest;
  }
  return column;
};

export const convertToLens: ConvertMetricVisToLensVisualization = async (vis, timefilter) => {
  if (!timefilter) {
    return null;
  }

  const dataViews = getDataViewsStart();
  const dataView = await getDataViewByIndexPatternId(vis.data.indexPattern?.id, dataViews);

  if (!dataView) {
    return null;
  }

  const [{ getColumnsFromVis, getPalette, getPercentageModeConfig }, { getConfiguration }] =
    await Promise.all([convertToLensModule, import('./configurations')]);

  const percentageModeConfig = getPercentageModeConfig(vis.params.metric);
  const layers = getColumnsFromVis(
    vis,
    timefilter,
    dataView,
    {
      splits: ['group'],
    },
    { dropEmptyRowsInDateHistogram: true, ...percentageModeConfig }
  );

  if (layers === null) {
    return null;
  }

  const [layerConfig] = layers;

  // for now, multiple metrics are not supported
  if (layerConfig.metrics.length > 1 || layerConfig.buckets.all.length > 1) {
    return null;
  }

  if (layerConfig.metrics[0]) {
    const metric = layerConfig.columns.find(({ columnId }) => columnId === layerConfig.metrics[0]);
    if (metric?.dataType !== 'number') {
      return null;
    }
  }

  const layerId = uuid();
  const indexPatternId = dataView.id!;

  return {
    type: 'lnsMetric',
    layers: [
      {
        indexPatternId,
        layerId,
        columns: layerConfig.columns.map(excludeMetaFromColumn),
        columnOrder: [],
      },
    ],
    configuration: getConfiguration(
      layerId,
      vis.params,
      getPalette(vis.params.metric, percentageModeConfig),
      layerConfig
    ),
    indexPatternIds: [indexPatternId],
  };
};
