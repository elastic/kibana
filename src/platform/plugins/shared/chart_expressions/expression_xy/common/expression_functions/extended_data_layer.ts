/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExtendedDataLayerFn } from '../types';
import { EXTENDED_DATA_LAYER } from '../constants';
import { strings } from '../i18n';
import { commonDataLayerArgs } from './common_data_layer_args';

export const extendedDataLayerFunction: ExtendedDataLayerFn = {
  name: EXTENDED_DATA_LAYER,
  aliases: [],
  type: EXTENDED_DATA_LAYER,
  help: strings.getDataLayerFnHelp(),
  inputTypes: ['datatable'],
  args: {
    ...commonDataLayerArgs,
    xAccessor: {
      types: ['vis_dimension', 'string'],
      help: strings.getXAccessorHelp(),
    },
    splitAccessors: {
      types: ['vis_dimension', 'string'],
      help: strings.getSplitAccessorHelp(),
      multi: true,
    },
    accessors: {
      types: ['vis_dimension', 'string'],
      help: strings.getAccessorsHelp(),
      multi: true,
    },
    markSizeAccessor: {
      types: ['vis_dimension', 'string'],
      help: strings.getMarkSizeAccessorHelp(),
    },
    layerId: {
      types: ['string'],
      help: strings.getLayerIdHelp(),
    },
  },
  async fn(input, args, context) {
    const { extendedDataLayerFn } = await import('./extended_data_layer_fn');
    return await extendedDataLayerFn(input, args, context);
  },
};
