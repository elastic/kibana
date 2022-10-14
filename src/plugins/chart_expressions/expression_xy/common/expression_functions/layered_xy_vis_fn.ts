/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { XY_VIS_RENDERER } from '../constants';
import { LayeredXyVisFn } from '../types';
import { logDatatables, logDatatable } from '../utils';
import {
  validateMarkSizeRatioLimits,
  validateAddTimeMarker,
  validateMinTimeBarInterval,
  hasBarLayer,
  errors,
  validateAxes,
} from './validate';
import { appendLayerIds, getDataLayers } from '../helpers';

export const layeredXyVisFn: LayeredXyVisFn['fn'] = async (data, args, handlers) => {
  const layers = appendLayerIds(args.layers ?? [], 'layers');
  const dataLayers = getDataLayers(layers);

  if (args.singleTable) {
    logDatatable(data, layers, handlers, args.splitColumnAccessor, args.splitRowAccessor);
  } else {
    logDatatables(
      layers,
      handlers,
      args.splitColumnAccessor,
      args.splitRowAccessor,
      args.annotations
    );
  }

  const hasBar = hasBarLayer(dataLayers);
  validateAddTimeMarker(dataLayers, args.addTimeMarker);
  validateMarkSizeRatioLimits(args.markSizeRatio);
  validateMinTimeBarInterval(dataLayers, hasBar, args.minTimeBarInterval);
  const hasMarkSizeAccessors =
    dataLayers.filter((dataLayer) => dataLayer.markSizeAccessor !== undefined).length > 0;

  if (!hasMarkSizeAccessors && args.markSizeRatio !== undefined) {
    throw new Error(errors.markSizeRatioWithoutAccessor());
  }

  validateAxes(dataLayers, args.yAxisConfigs);

  return {
    type: 'render',
    as: XY_VIS_RENDERER,
    value: {
      args: {
        ...args,
        layers,
        markSizeRatio: hasMarkSizeAccessors && !args.markSizeRatio ? 10 : args.markSizeRatio,
        ariaLabel:
          args.ariaLabel ??
          (handlers.variables?.embeddableTitle as string) ??
          handlers.getExecutionContext?.()?.description,
      },
      canNavigateToLens: Boolean(handlers.variables.canNavigateToLens),
      syncColors: handlers?.isSyncColorsEnabled?.() ?? false,
      syncTooltips: handlers?.isSyncTooltipsEnabled?.() ?? false,
      syncCursor: handlers?.isSyncCursorEnabled?.() ?? true,
    },
  };
};
