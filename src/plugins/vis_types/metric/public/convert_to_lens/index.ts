/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Column, ColumnWithMeta } from '@kbn/visualizations-plugin/common';
import {
  convertToLensModule,
  getDataViewByIndexPatternId,
} from '@kbn/visualizations-plugin/public';
import uuid from 'uuid';
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

  const [{ getColumnsFromVis }, { getConfiguration, getPercentageModeConfig }] = await Promise.all([
    convertToLensModule,
    import('./configurations'),
  ]);

  const result = getColumnsFromVis(
    vis,
    timefilter,
    dataView,
    {
      splits: ['group'],
    },
    { dropEmptyRowsInDateHistogram: true, ...getPercentageModeConfig(vis.params) }
  );

  if (result === null) {
    return null;
  }

  // for now, multiple metrics are not supported
  if (result.metrics.length > 1 || result.buckets.length > 1) {
    return null;
  }

  if (result.metrics[0]) {
    const metric = result.columns.find(({ columnId }) => columnId === result.metrics[0]);
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
        columns: result.columns.map(excludeMetaFromColumn),
        columnOrder: [],
      },
    ],
    configuration: getConfiguration(layerId, vis.params, result),
    indexPatternIds: [indexPatternId],
  };
};
