/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as uuidv4 } from 'uuid';
import { PercentageModeConfigWithMinMax } from '@kbn/visualizations-plugin/common';
import {
  getConvertToLensModule,
  getDataViewByIndexPatternId,
} from '@kbn/visualizations-plugin/public';
import { excludeMetaFromColumn } from '@kbn/visualizations-plugin/common/convert_to_lens';
import { getDataViewsStart } from '../services';
import { ConvertGaugeVisToLensVisualization } from './types';
import { getConfiguration } from './configurations/gauge';

export const convertToLens: ConvertGaugeVisToLensVisualization = async (vis, timefilter) => {
  if (!timefilter) {
    return null;
  }

  const dataViews = getDataViewsStart();
  const dataView = await getDataViewByIndexPatternId(vis.data.indexPattern?.id, dataViews);

  if (!dataView) {
    return null;
  }

  const { getColumnsFromVis, createStaticValueColumn, getPalette, getPercentageModeConfig } =
    await getConvertToLensModule();

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
        ignoreGlobalFilters: false,
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
