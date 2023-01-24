/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  CommonXYLayerConfig,
  ReferenceLineDecorationConfig,
  DataDecorationConfig,
} from '../../common';
import { getDataLayers, isAnnotationsLayer, isDataLayer, isReferenceLine } from './visualization';

export function isHorizontalChart(layers: CommonXYLayerConfig[]) {
  return getDataLayers(layers).every((l) => l.isHorizontal);
}

export const getSeriesColor = (layer: CommonXYLayerConfig, accessor: string) => {
  if (
    (isDataLayer(layer) && layer.splitAccessors) ||
    isAnnotationsLayer(layer) ||
    isReferenceLine(layer)
  ) {
    return null;
  }
  const decorations: Array<DataDecorationConfig | ReferenceLineDecorationConfig> | undefined =
    layer?.decorations;
  return (
    decorations?.find((decorationConfig) => decorationConfig.forAccessor === accessor)?.color ||
    null
  );
};
