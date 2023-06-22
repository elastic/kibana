/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { v4 as uuidv4 } from 'uuid';
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
import { ConvertGaugeVisToLensVisualization } from './types';

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

export const convertToLens: ConvertGaugeVisToLensVisualization = async (vis, timefilter) => {
  if (!timefilter) {
    return null;
  }

  const dataViews = getDataViewsStart();
  const dataView = await getDataViewByIndexPatternId(vis.data.indexPattern?.id, dataViews);

  if (!dataView) {
    return null;
  }

  const [
    { getColumnsFromVis, createStaticValueColumn, getPalette, getPercentageModeConfig },
    { getConfiguration },
  ] = await Promise.all([convertToLensModule, import('./configurations/gauge')]);

  const percentageModeConfig = getPercentageModeConfig(vis.params.gauge, false);

  const layers = getColumnsFromVis(
    vis,
    timefilter,
    dataView,
    {
      unsupported: ['group'],
    },
    { dropEmptyRowsInDateHistogram: true, ...percentageModeConfig }
  );

  if (layers === null) {
    return null;
  }

  const [layerConfig] = layers;

  // for now, multiple metrics are not supported
  if (layerConfig.metrics.length > 1 || layerConfig.buckets.all.length) {
    return null;
  }

  if (layerConfig.metrics[0]) {
    const metric = layerConfig.columns.find(({ columnId }) => columnId === layerConfig.metrics[0]);
    if (metric?.dataType !== 'number') {
      return null;
    }
  }

  const layerId = uuidv4();
  const indexPatternId = dataView.id!;

  const metricAccessor = layerConfig.metrics[0];
  const { min, max, isPercentageMode } = percentageModeConfig as PercentageModeConfigWithMinMax;
  const minColumn = createStaticValueColumn(isPercentageMode ? 0 : min);
  const maxColumn = createStaticValueColumn(isPercentageMode ? 1 : max);
  const columns = [...layerConfig.columns, minColumn, maxColumn];

  return {
    type: 'lnsGauge',
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
      vis.params,
      getPalette(vis.params.gauge, percentageModeConfig, true),
      {
        metricAccessor,
        minAccessor: minColumn.columnId,
        maxAccessor: maxColumn.columnId,
      }
    ),
    indexPatternIds: [indexPatternId],
  };
};
