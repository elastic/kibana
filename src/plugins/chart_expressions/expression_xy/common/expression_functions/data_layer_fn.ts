/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { validateAccessor } from '@kbn/visualizations-plugin/common/utils';
import { DATA_LAYER, LayerTypes } from '../constants';
import { DataLayerFn } from '../types';
import { validateMarkSizeForChartType } from './validate';

export const dataLayerFn: DataLayerFn['fn'] = async (table, args) => {
  validateMarkSizeForChartType(args.markSizeAccessor, args.seriesType);
  validateAccessor(args.markSizeAccessor, table.columns);

  return {
    type: DATA_LAYER,
    ...args,
    accessors: args.accessors ?? [],
    layerType: LayerTypes.DATA,
    table,
  };
};
