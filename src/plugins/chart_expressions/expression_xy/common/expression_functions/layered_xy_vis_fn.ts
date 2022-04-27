/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AxisExtentModes, XY_VIS_RENDERER } from '../constants';
import { appendLayerIds, getDataLayers } from '../helpers';
import { AxisExtentConfigResult, LayeredXyVisFn } from '../types';
import { logDatatables } from '../utils';
import {
  hasAreaLayer,
  hasBarLayer,
  isValidExtentWithCustomMode,
  validateExtentForDataBounds,
} from './validate';

const getCorrectExtent = (extent: AxisExtentConfigResult, hasBarOrArea: boolean) => {
  if (
    extent.mode === AxisExtentModes.CUSTOM &&
    hasBarOrArea &&
    !isValidExtentWithCustomMode(extent)
  ) {
    return { ...extent, lowerBound: NaN, upperBound: NaN };
  }
  return extent;
};

export const layeredXyVisFn: LayeredXyVisFn['fn'] = async (data, args, handlers) => {
  const layers = appendLayerIds(args.layers ?? [], 'layers');

  logDatatables(layers, handlers);

  const dataLayers = getDataLayers(layers);

  const hasBar = hasBarLayer(dataLayers);
  const hasArea = hasAreaLayer(dataLayers);

  args.axes?.forEach((axis) => {
    if (axis.extent) {
      validateExtentForDataBounds(axis.extent, dataLayers);
      axis.extent = getCorrectExtent(axis.extent, hasBar || hasArea);
    }
  });

  return {
    type: 'render',
    as: XY_VIS_RENDERER,
    value: {
      args: {
        ...args,
        layers,
        ariaLabel:
          args.ariaLabel ??
          (handlers.variables?.embeddableTitle as string) ??
          handlers.getExecutionContext?.()?.description,
      },
    },
  };
};
