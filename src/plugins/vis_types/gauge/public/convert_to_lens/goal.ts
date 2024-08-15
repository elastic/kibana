/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { v4 as uuidv4 } from 'uuid';
import { PercentageModeConfigWithMinMax } from '@kbn/visualizations-plugin/common';
import {
  convertToLensModule,
  getDataViewByIndexPatternId,
} from '@kbn/visualizations-plugin/public';
import { excludeMetaFromColumn } from '@kbn/visualizations-plugin/common/convert_to_lens';
import { getDataViewsStart, getPalettesService } from '../services';
import { ConvertGoalVisToLensVisualization } from './types';
import { getMetricConfiguration } from './configurations/metric';
import { getGaugeConfiguration } from './configurations/gauge';

export const convertToLens: ConvertGoalVisToLensVisualization = async (vis, timefilter) => {
  if (!timefilter) {
    return null;
  }

  const palettes = await getPalettesService().getPalettes();
  const dataViews = getDataViewsStart();
  const dataView = await getDataViewByIndexPatternId(vis.data.indexPattern?.id, dataViews);

  if (!dataView) {
    return null;
  }

  const {
    getColumnsFromVis,
    getPredefinedPalette,
    getPercentageModeConfig,
    createStaticValueColumn,
  } = await convertToLensModule;

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
  const { max, isPercentageMode } = percentageModeConfig as PercentageModeConfigWithMinMax;

  const maxColumn = createStaticValueColumn(isPercentageMode ? 1 : max);

  const columns = [...layerConfig.columns, maxColumn];
  const layerId = uuidv4();
  const indexPatternId = dataView.id!;
  const palette = getPredefinedPalette(palettes, vis.params.gauge, percentageModeConfig, true);

  if (layerConfig.buckets.all.length === 0) {
    const [metricAccessor] = layerConfig.metrics;

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
      configuration: getGaugeConfiguration(layerId, vis.params, palette, {
        metricAccessor,
        maxAccessor: maxColumn.columnId,
      }),
      indexPatternIds: [indexPatternId],
    };
  }

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
    configuration: getMetricConfiguration(layerId, vis.params, palette, {
      ...layerConfig,
      maxAccessor: maxColumn.columnId,
    }),
    indexPatternIds: [indexPatternId],
  };
};
