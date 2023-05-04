/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HeatmapConfiguration } from '@kbn/visualizations-plugin/common';
import { Vis } from '@kbn/visualizations-plugin/public';
import { HeatmapVisParams } from '../../types';
import { getPaletteForHeatmap } from './palette';

export const getConfiguration = async (
  layerId: string,
  vis: Vis<HeatmapVisParams>,
  {
    metrics,
    buckets,
  }: {
    metrics: string[];
    buckets: string[];
  }
): Promise<HeatmapConfiguration> => {
  const [valueAccessor] = metrics;
  const [xAccessor, yAccessor] = buckets;

  const { params, uiState } = vis;
  const state = uiState.get('vis', {}) ?? {};

  const palette = await getPaletteForHeatmap(params);
  return {
    layerId,
    layerType: 'data',
    shape: 'heatmap',
    legend: {
      type: 'heatmap_legend',
      isVisible: state.legendOpen,
      position: params.legendPosition,
    },
    gridConfig: {
      type: 'heatmap_grid',
      isCellLabelVisible: params.valueAxes?.[0].labels.show ?? false,
      isXAxisLabelVisible: true,
      isYAxisLabelVisible: true,
      isYAxisTitleVisible: true,
      isXAxisTitleVisible: true,
    },
    valueAccessor,
    xAccessor,
    yAccessor,
    palette: palette ? { ...palette, accessor: valueAccessor } : undefined,
  };
};
