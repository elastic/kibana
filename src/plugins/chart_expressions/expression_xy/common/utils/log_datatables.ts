/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Datatable, ExecutionContext } from '@kbn/expressions-plugin/common';
import { ExpressionValueVisDimension } from '@kbn/visualizations-plugin/common';
import { Dimension, prepareLogTable } from '@kbn/visualizations-plugin/common/utils';
import { LayerTypes, REFERENCE_LINE } from '../constants';
import { strings } from '../i18n';
import { CommonXYDataLayerConfig, CommonXYLayerConfig, ReferenceLineLayerConfig } from '../types';

export const logDatatables = (
  layers: CommonXYLayerConfig[],
  handlers: ExecutionContext,
  splitColumnAccessor?: string | ExpressionValueVisDimension,
  splitRowAccessor?: string | ExpressionValueVisDimension
) => {
  if (!handlers?.inspectorAdapters?.tables) {
    return;
  }

  handlers.inspectorAdapters.tables.reset();
  handlers.inspectorAdapters.tables.allowCsvExport = true;

  layers.forEach((layer) => {
    if (layer.layerType === LayerTypes.ANNOTATIONS || layer.type === REFERENCE_LINE) {
      return;
    }

    const layerDimensions = getLayerDimensions(layer);

    layerDimensions.push([
      splitColumnAccessor ? [splitColumnAccessor] : undefined,
      strings.getSplitColumnHelp(),
    ]);
    layerDimensions.push([
      splitRowAccessor ? [splitRowAccessor] : undefined,
      strings.getSplitRowHelp(),
    ]);

    const logTable = prepareLogTable(layer.table, layerDimensions, true);
    handlers.inspectorAdapters.tables.logDatatable(layer.layerId, logTable);
  });
};

export const logDatatable = (
  data: Datatable,
  layers: CommonXYLayerConfig[],
  handlers: ExecutionContext,
  splitColumnAccessor?: string | ExpressionValueVisDimension,
  splitRowAccessor?: string | ExpressionValueVisDimension
) => {
  if (handlers.inspectorAdapters.tables) {
    handlers.inspectorAdapters.tables.reset();
    handlers.inspectorAdapters.tables.allowCsvExport = true;

    const layerDimensions = layers.reduce<Dimension[]>((dimensions, layer) => {
      if (layer.layerType === LayerTypes.ANNOTATIONS || layer.type === REFERENCE_LINE) {
        return dimensions;
      }

      return [...dimensions, ...getLayerDimensions(layer)];
    }, []);

    layerDimensions.push([
      splitColumnAccessor ? [splitColumnAccessor] : undefined,
      strings.getSplitColumnHelp(),
    ]);
    layerDimensions.push([
      splitRowAccessor ? [splitRowAccessor] : undefined,
      strings.getSplitRowHelp(),
    ]);

    const logTable = prepareLogTable(data, layerDimensions, true);
    handlers.inspectorAdapters.tables.logDatatable('default', logTable);
  }
};

export const getLayerDimensions = (
  layer: CommonXYDataLayerConfig | ReferenceLineLayerConfig
): Dimension[] => {
  let xAccessor;
  let splitAccessors;
  let markSizeAccessor;
  if (layer.layerType === LayerTypes.DATA) {
    xAccessor = layer.xAccessor;
    splitAccessors = layer.splitAccessors;
    markSizeAccessor = layer.markSizeAccessor;
  }

  const { accessors, layerType } = layer;
  return [
    [
      accessors ? accessors : undefined,
      layerType === LayerTypes.DATA ? strings.getMetricHelp() : strings.getReferenceLineHelp(),
    ],
    [xAccessor ? [xAccessor] : undefined, strings.getXAxisHelp()],
    [splitAccessors ? splitAccessors : undefined, strings.getBreakdownHelp()],
    [markSizeAccessor ? [markSizeAccessor] : undefined, strings.getMarkSizeHelp()],
  ];
};
