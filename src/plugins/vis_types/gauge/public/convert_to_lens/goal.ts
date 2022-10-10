/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import uuid from 'uuid';
import {
  Column,
  ColumnWithMeta,
  PercentageModeConfigWithMinMax,
} from '@kbn/visualizations-plugin/common';
import {
  convertToLensModule,
  getDataViewByIndexPatternId,
} from '@kbn/visualizations-plugin/public';
import { getDataViewsStart } from '../services';
import { ConvertGoalVisToLensVisualization } from './types';

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

export const convertToLens: ConvertGoalVisToLensVisualization = async (vis, timefilter) => {
  if (!timefilter) {
    return null;
  }

  const dataViews = getDataViewsStart();
  const dataView = await getDataViewByIndexPatternId(vis.data.indexPattern?.id, dataViews);

  if (!dataView) {
    return null;
  }

  const [
    { getColumnsFromVis, getPalette, getPercentageModeConfig, createStaticValueColumn },
    { getConfiguration },
  ] = await Promise.all([convertToLensModule, import('./configurations/goal')]);

  const percentageModeConfig = getPercentageModeConfig(vis.params.gauge, false);

  const result = getColumnsFromVis(
    vis,
    timefilter,
    dataView,
    {
      splits: ['group'],
    },
    { dropEmptyRowsInDateHistogram: true, ...percentageModeConfig }
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
  const { isPercentageMode, max } = percentageModeConfig as PercentageModeConfigWithMinMax;
  const maxColumn = createStaticValueColumn(isPercentageMode ? 1 : max);

  const columns = [...result.columns, maxColumn];
  const layerId = uuid();
  const indexPatternId = dataView.id!;
  return {
    type: 'lnsMetric',
    layers: [
      {
        indexPatternId,
        layerId,
        columns: columns.map(excludeMetaFromColumn),
        columnOrder: [],
      },
    ],
    configuration: getConfiguration(
      layerId,
      getPalette(vis.params.gauge, percentageModeConfig, true),
      {
        ...result,
        maxAccessor: maxColumn.columnId,
      }
    ),
    indexPatternIds: [indexPatternId],
  };
};
