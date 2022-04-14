/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CommonXYLayerConfigResult, SeriesType, ExtendedYConfig, YConfig } from '../../common';
import { getDataLayers, isAnnotationsLayer, isDataLayer } from './visualization';

export function isHorizontalSeries(seriesType: SeriesType) {
  return (
    seriesType === 'bar_horizontal' ||
    seriesType === 'bar_horizontal_stacked' ||
    seriesType === 'bar_horizontal_percentage_stacked'
  );
}

export function isStackedChart(seriesType: SeriesType) {
  return seriesType.includes('stacked');
}

export function isHorizontalChart(layers: CommonXYLayerConfigResult[]) {
  return getDataLayers(layers).every((l) => isHorizontalSeries(l.seriesType));
}

export const getSeriesColor = (layer: CommonXYLayerConfigResult, accessor: string) => {
  if ((isDataLayer(layer) && layer.splitAccessor) || isAnnotationsLayer(layer)) {
    return null;
  }
  const yConfig: Array<YConfig | ExtendedYConfig> | undefined = layer?.yConfig;
  return yConfig?.find((yConf) => yConf.forAccessor === accessor)?.color || null;
};
