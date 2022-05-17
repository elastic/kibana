/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Datatable, PointSeriesColumnNames } from '@kbn/expressions-plugin/common';
import { WithLayerId, ExtendedDataLayerConfig, XYExtendedLayerConfigResult } from '../types';
import { LayerTypes } from '../constants';

function isWithLayerId<T>(layer: T): layer is T & WithLayerId {
  return (layer as T & WithLayerId).layerId ? true : false;
}

export const generateLayerId = (keyword: string, index: number) => `${keyword}-${index}`;

export function appendLayerIds<T>(
  layers: Array<T | undefined>,
  keyword: string
): Array<T & WithLayerId> {
  return layers
    .filter((l): l is T => l !== undefined)
    .map((l, index) => ({
      ...l,
      layerId: isWithLayerId(l) ? l.layerId : generateLayerId(keyword, index),
    }));
}

export function getDataLayers(layers: XYExtendedLayerConfigResult[]) {
  return layers.filter<ExtendedDataLayerConfig>(
    (layer): layer is ExtendedDataLayerConfig =>
      layer.layerType === LayerTypes.DATA || !layer.layerType
  );
}

export function getAccessors<T, U extends { splitAccessor?: T; xAccessor?: T; accessors: T[] }>(
  args: U,
  table: Datatable
) {
  let splitAccessor: T | string | undefined = args.splitAccessor;
  let xAccessor: T | string | undefined = args.xAccessor;
  let accessors: Array<T | string> = args.accessors ?? [];
  if (!splitAccessor && !xAccessor && !(accessors && accessors.length)) {
    const y = table.columns.find((column) => column.id === PointSeriesColumnNames.Y)?.id;
    xAccessor = table.columns.find((column) => column.id === PointSeriesColumnNames.X)?.id;
    splitAccessor = table.columns.find((column) => column.id === PointSeriesColumnNames.COLOR)?.id;
    accessors = y ? [y] : [];
  }

  return { splitAccessor, xAccessor, accessors };
}
