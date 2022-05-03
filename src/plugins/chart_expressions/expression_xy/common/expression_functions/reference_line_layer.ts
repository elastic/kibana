/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LayerTypes, REFERENCE_LINE_LAYER } from '../constants';
import { ReferenceLineLayerFn } from '../types';
import { strings } from '../i18n';
import { commonReferenceLineLayerArgs } from './common_reference_line_layer_args';

export const referenceLineLayerFunction: ReferenceLineLayerFn = {
  name: REFERENCE_LINE_LAYER,
  aliases: [],
  type: REFERENCE_LINE_LAYER,
  help: strings.getRLHelp(),
  inputTypes: ['datatable'],
  args: { ...commonReferenceLineLayerArgs },
  fn(table, args) {
    return {
      type: REFERENCE_LINE_LAYER,
      ...args,
      accessors: args.accessors ?? [],
      layerType: LayerTypes.REFERENCELINE,
      table,
    };
  },
};
