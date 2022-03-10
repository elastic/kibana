/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ExpressionFunctionDefinition } from '../../../../expressions/common';
import { LayerTypes, REFERENCE_LINE_LAYER, Y_CONFIG } from '../constants';
import { ReferenceLineLayerArgs, ReferenceLineLayerConfigResult } from '../types';

export const referenceLineLayerConfigFunction: ExpressionFunctionDefinition<
  typeof REFERENCE_LINE_LAYER,
  null,
  ReferenceLineLayerArgs,
  ReferenceLineLayerConfigResult
> = {
  name: REFERENCE_LINE_LAYER,
  aliases: [],
  type: REFERENCE_LINE_LAYER,
  help: `Configure a layer in the xy chart`,
  inputTypes: ['null'],
  args: {
    layerId: {
      types: ['string'],
      help: '',
    },
    accessors: {
      types: ['string'],
      help: 'The columns to display on the y axis.',
      multi: true,
    },
    yConfig: {
      types: [Y_CONFIG],
      help: 'Additional configuration for y axes',
      multi: true,
    },
    columnToLabel: {
      types: ['string'],
      help: 'JSON key-value pairs of column ID to label',
    },
  },
  fn(input, args) {
    return {
      type: REFERENCE_LINE_LAYER,
      ...args,
      layerType: LayerTypes.REFERENCELINE,
    };
  },
};
