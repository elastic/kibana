/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { validateAccessor } from '@kbn/visualizations-plugin/common/utils';
import { LayerTypes, REFERENCE_LINE_LAYER, EXTENDED_Y_CONFIG } from '../constants';
import { ReferenceLineLayerFn } from '../types';
import { strings } from '../i18n';

export const referenceLineLayerFunction: ReferenceLineLayerFn = {
  name: REFERENCE_LINE_LAYER,
  aliases: [],
  type: REFERENCE_LINE_LAYER,
  help: strings.getRLHelp(),
  inputTypes: ['datatable'],
  args: {
    accessors: {
      types: ['string'],
      help: strings.getRLAccessorsHelp(),
      multi: true,
    },
    yConfig: {
      types: [EXTENDED_Y_CONFIG],
      help: strings.getRLYConfigHelp(),
      multi: true,
    },
    columnToLabel: {
      types: ['string'],
      help: strings.getColumnToLabelHelp(),
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
      type: REFERENCE_LINE_LAYER,
      ...args,
      layerType: LayerTypes.REFERENCELINE,
      table: args.table ?? input,
    };
  },
};
