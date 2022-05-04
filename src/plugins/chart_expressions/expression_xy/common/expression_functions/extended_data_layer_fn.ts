/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { validateAccessor } from '@kbn/visualizations-plugin/common/utils';
import { EXTENDED_DATA_LAYER, LayerTypes } from '../constants';
import { ExtendedDataLayerFn } from '../types';
import { validateMarkSizeForChartType } from './validate';

export const extendedDataLayerFn: ExtendedDataLayerFn['fn'] = async (input, args) => {
  const table = args.table ?? input;

  validateMarkSizeForChartType(args.markSizeAccessor, args.seriesType);
  validateAccessor(args.markSizeAccessor, table.columns);

  return {
    type: EXTENDED_DATA_LAYER,
    ...args,
    accessors: args.accessors ?? [],
    layerType: LayerTypes.DATA,
    table,
  };
};
