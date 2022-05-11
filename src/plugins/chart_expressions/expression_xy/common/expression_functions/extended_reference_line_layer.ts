/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { validateAccessor } from '@kbn/visualizations-plugin/common/utils';
import { LayerTypes, EXTENDED_REFERENCE_LINE_LAYER } from '../constants';
import { ExtendedReferenceLineLayerFn } from '../types';
import { strings } from '../i18n';
import { commonReferenceLineLayerArgs } from './common_reference_line_layer_args';

export const extendedReferenceLineLayerFunction: ExtendedReferenceLineLayerFn = {
  name: EXTENDED_REFERENCE_LINE_LAYER,
  aliases: [],
  type: EXTENDED_REFERENCE_LINE_LAYER,
  help: strings.getRLHelp(),
  inputTypes: ['datatable'],
  args: {
    ...commonReferenceLineLayerArgs,
    accessors: {
      types: ['string'],
      help: strings.getRLAccessorsHelp(),
      multi: true,
    },
    table: {
      types: ['datatable'],
      help: strings.getTableHelp(),
    },
    layerId: {
      types: ['string'],
      help: strings.getLayerIdHelp(),
    },
  },
  fn(input, args) {
    const table = args.table ?? input;
    const accessors = args.accessors ?? [];
    accessors.forEach((accessor) => validateAccessor(accessor, table.columns));

    return {
      type: EXTENDED_REFERENCE_LINE_LAYER,
      ...args,
      accessors: args.accessors ?? [],
      layerType: LayerTypes.REFERENCELINE,
      table,
    };
  },
};
