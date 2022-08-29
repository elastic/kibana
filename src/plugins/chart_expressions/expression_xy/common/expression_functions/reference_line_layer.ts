/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { REFERENCE_LINE_LAYER, REFERENCE_LINE_DECORATION_CONFIG } from '../constants';
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
    decorations: {
      types: [REFERENCE_LINE_DECORATION_CONFIG],
      help: strings.getRLDecorationConfigHelp(),
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
  async fn(input, args, context) {
    const { referenceLineLayerFn } = await import('./reference_line_layer_fn');
    return await referenceLineLayerFn(input, args, context);
  },
};
