/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Column, HeatmapConfiguration } from '@kbn/visualizations-plugin/common';
import { Vis } from '@kbn/visualizations-plugin/public';
import { HeatmapVisParams } from '../../types';
import { getPaletteForHeatmap } from './palette';

export const getConfiguration = async (
  layerId: string,
  vis: Vis<HeatmapVisParams>,
  {
    metrics,
    buckets,
    columns,
  }: {
    metrics: string[];
    buckets: {
      all: string[];
      customBuckets: Record<string, string>;
    };
    columns: Column[];
  }
): Promise<HeatmapConfiguration | null> => {
  const [valueAccessor] = metrics;
  const xColumn = columns.find(({ isBucketed, isSplit }) => isBucketed && !isSplit);
  const yColumn = columns.find(({ isBucketed, isSplit }) => isBucketed && isSplit);
  if (yColumn && !xColumn) {
    return null;
  }
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
    xAccessor: xColumn?.columnId,
    yAccessor: yColumn?.columnId,
    palette: palette ? { ...palette, accessor: valueAccessor } : undefined,
  };
};
