/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { XY_VIS_RENDERER } from '../constants';
import { appendLayerIds, getDataLayers } from '../helpers';
import { LayeredXyVisFn } from '../types';
import { logDatatables } from '../utils';
import { validateMinTimeBarInterval, hasBarLayer } from './validate';

export const layeredXyVisFn: LayeredXyVisFn['fn'] = async (data, args, handlers) => {
  const layers = appendLayerIds(args.layers ?? [], 'layers');

  logDatatables(layers, handlers);

  const dataLayers = getDataLayers(layers);
  const hasBar = hasBarLayer(dataLayers);
  validateMinTimeBarInterval(dataLayers, hasBar, args.minTimeBarInterval);

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
