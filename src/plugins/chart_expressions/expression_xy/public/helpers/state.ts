/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getAccessorByDimension } from '../../../../../plugins/visualizations/common/utils';
import type { Datatable } from '../../../../expressions/public';
import type { SeriesType, XYLayerConfigResult, YConfig } from '../../common';
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

export function isHorizontalChart(layers: XYLayerConfigResult[]) {
  return getDataLayers(layers).every((l) => isHorizontalSeries(l.seriesType));
}

export const getSeriesColor = (layer: XYLayerConfigResult, accessor: string, table: Datatable) => {
  if ((isDataLayer(layer) && layer.splitAccessor) || isAnnotationsLayer(layer)) {
    return null;
  }

  return (
    layer?.yConfig?.find(
      (yConfig: YConfig) => getAccessorByDimension(yConfig.forAccessor, table.columns) === accessor
    )?.color || null
  );
};
