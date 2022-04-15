/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CommonXYLayerConfigResult, ExtendedYConfig, YConfig } from '../../common';
import { getDataLayers, isAnnotationsLayer, isDataLayer } from './visualization';

export function isHorizontalChart(layers: CommonXYLayerConfigResult[]) {
  return getDataLayers(layers).every((l) => l.isHorizontal);
}

export const getSeriesColor = (layer: CommonXYLayerConfigResult, accessor: string) => {
  if ((isDataLayer(layer) && layer.splitAccessor) || isAnnotationsLayer(layer)) {
    return null;
  }
  const yConfig: Array<YConfig | ExtendedYConfig> | undefined = layer?.yConfig;
  return yConfig?.find((yConf) => yConf.forAccessor === accessor)?.color || null;
};
