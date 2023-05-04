/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Position } from '@elastic/charts';
import { XYConfiguration, XYLayerConfig } from '@kbn/visualizations-plugin/common';
import { Panel } from '../../../../../common/types';
import { getYExtents } from './extents';

export const getConfigurationForTimeseries = (
  model: Panel,
  layers: XYLayerConfig[]
): XYConfiguration => {
  const extents = getYExtents(model);
  return {
    layers,
    fillOpacity: Number(model.series[0].fill) ?? 0.3,
    legend: {
      isVisible: Boolean(model.show_legend),
      showSingleSeries: Boolean(model.show_legend),
      position: (model.legend_position as Position) ?? Position.Right,
      shouldTruncate: Boolean(model.truncate_legend),
      maxLines: model.max_lines_legend ?? 1,
    },
    gridlinesVisibilitySettings: {
      x: Boolean(model.show_grid),
      yLeft: Boolean(model.show_grid),
      yRight: Boolean(model.show_grid),
    },
    yLeftExtent: extents.yLeftExtent,
    yRightExtent: extents.yRightExtent,
    yLeftScale: model.axis_scale === 'log' ? 'log' : 'linear',
    yRightScale: model.axis_scale === 'log' ? 'log' : 'linear',
  };
};

export const getConfigurationForTopN = (
  model: Panel,
  layers: XYLayerConfig[]
): XYConfiguration => ({
  layers,
  fillOpacity: Number(model.series[0].fill) ?? 0.3,
  legend: {
    isVisible: Boolean(model.show_legend),
    showSingleSeries: Boolean(model.show_legend),
    position: (model.legend_position as Position) ?? Position.Right,
    shouldTruncate: Boolean(model.truncate_legend),
    maxLines: model.max_lines_legend ?? 1,
  },
  gridlinesVisibilitySettings: {
    x: false,
    yLeft: false,
    yRight: false,
  },
  tickLabelsVisibilitySettings: {
    x: true,
    yLeft: false,
    yRight: false,
  },
  axisTitlesVisibilitySettings: {
    x: false,
    yLeft: false,
    yRight: false,
  },
  valueLabels: 'show',
});
