/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Datatable, PointSeriesColumnNames } from '@kbn/expressions-plugin/common';
import {
  WithLayerId,
  ExtendedDataLayerConfig,
  XYExtendedLayerConfigResult,
  ExtendedDataLayerArgs,
  DataLayerArgs,
} from '../types';
import { LayerTypes, SeriesTypes } from '../constants';

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

export const getShowLines = (args: DataLayerArgs | ExtendedDataLayerArgs) =>
  args.showLines ?? (args.seriesType === SeriesTypes.LINE || args.seriesType !== SeriesTypes.AREA);

export function getDataLayers(layers: XYExtendedLayerConfigResult[]) {
  return layers.filter<ExtendedDataLayerConfig>(
    (layer): layer is ExtendedDataLayerConfig =>
      layer.layerType === LayerTypes.DATA || !layer.layerType
  );
}

export function getAccessors<
  T,
  U extends { splitAccessors?: T[]; xAccessor?: T; accessors: T[]; markSizeAccessor?: T }
>(args: U, table: Datatable) {
  let splitAccessors: Array<T | string> | undefined = args.splitAccessors;
  let xAccessor: T | string | undefined = args.xAccessor;
  let accessors: Array<T | string> = args.accessors ?? [];
  let markSizeAccessor: T | string | undefined = args.markSizeAccessor;

  if (
    !(splitAccessors && splitAccessors.length) &&
    !xAccessor &&
    !(accessors && accessors.length) &&
    !markSizeAccessor
  ) {
    const y = table.columns.find((column) => column.id === PointSeriesColumnNames.Y)?.id;
    const splitColumnId = table.columns.find(
      (column) => column.id === PointSeriesColumnNames.COLOR
    )?.id;
    xAccessor = table.columns.find((column) => column.id === PointSeriesColumnNames.X)?.id;
    splitAccessors = splitColumnId ? [splitColumnId] : [];
    accessors = y ? [y] : [];
    markSizeAccessor = table.columns.find(
      (column) => column.id === PointSeriesColumnNames.SIZE
    )?.id;
  }

  return { splitAccessors, xAccessor, accessors, markSizeAccessor };
}
