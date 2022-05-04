/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EXTENDED_DATA_LAYER, LayerTypes } from '../constants';
import { getShowLines } from '../helpers';
import { ExtendedDataLayerFn } from '../types';
import { validateDataLayer } from './validate';

export const extendedDataLayerFn: ExtendedDataLayerFn['fn'] = async (input, args) => {
  const table = args.table ?? input;

  validateDataLayer(args, table);

  const showLines = getShowLines(args);

  return {
    type: EXTENDED_DATA_LAYER,
    ...args,
    accessors: args.accessors ?? [],
    layerType: LayerTypes.DATA,
    table,
    showLines,
  };
};
