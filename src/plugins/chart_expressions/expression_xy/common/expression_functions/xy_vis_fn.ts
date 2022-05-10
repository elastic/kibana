/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import { Dimension, prepareLogTable } from '@kbn/visualizations-plugin/common/utils';
import { Datatable } from '@kbn/expressions-plugin';
import { LayerTypes, XY_VIS_RENDERER, DATA_LAYER } from '../constants';
import { appendLayerIds } from '../helpers';
import { DataLayerConfigResult, XYLayerConfig, XyVisFn } from '../types';
import { getLayerDimensions } from '../utils';
import {
  hasAreaLayer,
  hasBarLayer,
  hasHistogramBarLayer,
  validateExtent,
  validateFillOpacity,
  validateValueLabels,
} from './validate';

function normalizeTable(data: Datatable, xAccessor?: string) {
  if (xAccessor) {
    const xColumn = data.columns.find((col) => col.id === xAccessor);
    data.rows = data.rows.reduce<Datatable['rows']>((normalizedRows, row) => {
      return [
        ...normalizedRows,
        {
          ...row,
          [xAccessor]:
            xColumn?.meta.type === 'date' && typeof row[xAccessor] === 'string'
              ? moment(row[xAccessor]).valueOf()
              : row[xAccessor],
        },
      ];
    }, []);
  }
}

export const xyVisFn: XyVisFn['fn'] = async (data, args, handlers) => {
  const {
    referenceLineLayers = [],
    annotationLayers = [],
    seriesType,
    accessors = [],
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

  normalizeTable(data, xAccessor);

  const dataLayers: DataLayerConfigResult[] = [
    {
      type: DATA_LAYER,
      seriesType,
      accessors,
      xAccessor,
      hide,
      splitAccessor,
      columnToLabel,
      yScaleType,
      xScaleType,
      isHistogram,
      palette,
      yConfig,
      layerType: LayerTypes.DATA,
      table: data,
    },
  ];
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
