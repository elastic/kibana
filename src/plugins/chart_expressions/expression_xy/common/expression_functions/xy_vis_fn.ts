/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  Dimension,
  prepareLogTable,
  validateAccessor,
} from '@kbn/visualizations-plugin/common/utils';
import type { Datatable } from '@kbn/expressions-plugin/common';
import { ExpressionValueVisDimension } from '@kbn/visualizations-plugin/common/expression_functions';
import { LayerTypes, XY_VIS_RENDERER, DATA_LAYER } from '../constants';
import { appendLayerIds, getAccessors } from '../helpers';
import { DataLayerConfigResult, XYLayerConfig, XyVisFn, XYArgs } from '../types';
import { getLayerDimensions } from '../utils';
import {
  hasAreaLayer,
  hasBarLayer,
  hasHistogramBarLayer,
  validateExtent,
  validateFillOpacity,
  validateValueLabels,
} from './validate';

const createDataLayer = (args: XYArgs, table: Datatable): DataLayerConfigResult => ({
  type: DATA_LAYER,
  seriesType: args.seriesType,
  hide: args.hide,
  columnToLabel: args.columnToLabel,
  yScaleType: args.yScaleType,
  xScaleType: args.xScaleType,
  isHistogram: args.isHistogram,
  palette: args.palette,
  yConfig: args.yConfig,
  layerType: LayerTypes.DATA,
  table,
  ...getAccessors<string | ExpressionValueVisDimension, XYArgs>(args, table),
});

export const xyVisFn: XyVisFn['fn'] = async (data, args, handlers) => {
  validateAccessor(args.splitRowAccessor, data.columns);
  validateAccessor(args.splitColumnAccessor, data.columns);

  const {
    referenceLineLayers = [],
    annotationLayers = [],
    // data_layer args
    seriesType,
    accessors,
    xAccessor,
    hide,
    splitAccessor,
    columnToLabel,
    yScaleType,
    xScaleType,
    isHistogram,
    yConfig,
    palette,
    ...restArgs
  } = args;

  validateAccessor(xAccessor, data.columns);
  validateAccessor(splitAccessor, data.columns);
  accessors.forEach((accessor) => validateAccessor(accessor, data.columns));

  const dataLayers: DataLayerConfigResult[] = [createDataLayer(args, data)];

  const layers: XYLayerConfig[] = [
    ...appendLayerIds(dataLayers, 'dataLayers'),
    ...appendLayerIds(referenceLineLayers, 'referenceLineLayers'),
    ...appendLayerIds(annotationLayers, 'annotationLayers'),
  ];

  if (handlers.inspectorAdapters.tables) {
    handlers.inspectorAdapters.tables.reset();
    handlers.inspectorAdapters.tables.allowCsvExport = true;

    const layerDimensions = layers.reduce<Dimension[]>((dimensions, layer) => {
      if (layer.layerType === LayerTypes.ANNOTATIONS) {
        return dimensions;
      }

      return [...dimensions, ...getLayerDimensions(layer)];
    }, []);

    const logTable = prepareLogTable(data, layerDimensions, true);
    handlers.inspectorAdapters.tables.logDatatable('default', logTable);
  }

  const hasBar = hasBarLayer(dataLayers);
  const hasArea = hasAreaLayer(dataLayers);

  validateExtent(args.yLeftExtent, hasBar || hasArea, dataLayers);
  validateExtent(args.yRightExtent, hasBar || hasArea, dataLayers);
  validateFillOpacity(args.fillOpacity, hasArea);

  const hasNotHistogramBars = !hasHistogramBarLayer(dataLayers);

  validateValueLabels(args.valueLabels, hasBar, hasNotHistogramBars);

  return {
    type: 'render',
    as: XY_VIS_RENDERER,
    value: {
      args: {
        ...restArgs,
        layers,
        ariaLabel:
          args.ariaLabel ??
          (handlers.variables?.embeddableTitle as string) ??
          handlers.getExecutionContext?.()?.description,
      },
    },
  };
};
