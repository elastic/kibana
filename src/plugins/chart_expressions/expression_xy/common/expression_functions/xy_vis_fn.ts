/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Datatable } from '@kbn/expressions-plugin/common';
import { Dimension, prepareLogTable } from '@kbn/visualizations-plugin/common/utils';
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
  ...getAccessors(args, table),
});

export const xyVisFn: XyVisFn['fn'] = async (data, args, handlers) => {
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

  const dataLayers: DataLayerConfigResult[] = [createDataLayer(args, data)];

  const layers: XYLayerConfig[] = [
    ...appendLayerIds(dataLayers, 'dataLayers'),
    ...appendLayerIds(referenceLineLayers, 'referenceLineLayers'),
    ...appendLayerIds(annotationLayers, 'annotationLayers'),
  ];

  if (handlers.inspectorAdapters.tables) {
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
