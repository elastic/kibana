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
import { ConvertGoalVisToLensVisualization } from './types';
import { getConfiguration } from './configurations/goal';

export const convertToLens: ConvertGoalVisToLensVisualization = async (vis, timefilter) => {
  if (!timefilter) {
    return null;
  }

  const dataViews = getDataViewsStart();
  const dataView = await getDataViewByIndexPatternId(vis.data.indexPattern?.id, dataViews);

  if (!dataView) {
    return null;
  }

  const { getColumnsFromVis, getPalette, getPercentageModeConfig, createStaticValueColumn } =
    await getConvertToLensModule();

  const percentageModeConfig = getPercentageModeConfig(vis.params.gauge, false);

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
  const { isPercentageMode, max } = percentageModeConfig as PercentageModeConfigWithMinMax;
  const maxColumn = createStaticValueColumn(isPercentageMode ? 1 : max);

  const columns = [...layerConfig.columns, maxColumn];
  const layerId = uuidv4();
  const indexPatternId = dataView.id!;

  return {
    type: 'lnsMetric',
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
        ...layerConfig,
        maxAccessor: maxColumn.columnId,
      }
    ),
    indexPatternIds: [indexPatternId],
  };
};
