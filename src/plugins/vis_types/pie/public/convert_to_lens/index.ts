/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Column, ColumnWithMeta } from '@kbn/visualizations-plugin/common';
import { getColumnsFromVis } from '@kbn/visualizations-plugin/public';
import uuid from 'uuid';
import { getDataViewsStart } from '../services';
import { getConfiguration } from './configurations';
import { ConvertPieToLensVisualization } from './types';

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

export const convertToLens: ConvertPieToLensVisualization = async (vis, timefilter) => {
  if (!timefilter) {
    return null;
  }

  const dataViews = getDataViewsStart();
  const dataView = vis.data.indexPattern?.id
    ? await dataViews.get(vis.data.indexPattern.id)
    : await dataViews.getDefault();

  if (!dataView) {
    return null;
  }

  const result = getColumnsFromVis(vis, timefilter, dataView, {
    buckets: [],
    splits: ['segment'],
  });

  if (result === null) {
    return null;
  }

  // doesn't suuport more than three split slice levels
  // doesn't support pie without at least one split slice
  if (result.buckets.length > 2 || !result.buckets.length) {
    return null;
  }

  const layerId = uuid();

  return {
    type: 'lnsPie',
    layers: [
      {
        indexPatternId: dataView.id!,
        layerId,
        columns: result.columns
          .filter((column) => column.columnId !== result.metrics[1])
          .map(excludeMetaFromColumn),
        columnOrder: [],
      },
    ],
    configuration: getConfiguration(layerId, vis, result),
  };
};
