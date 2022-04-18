/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { Datatable, ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import { LayerTypes, REFERENCE_LINE_LAYER, EXTENDED_Y_CONFIG } from '../constants';
import { ReferenceLineLayerArgs, ReferenceLineLayerConfigResult } from '../types';

export const referenceLineLayerFunction: ExpressionFunctionDefinition<
  typeof REFERENCE_LINE_LAYER,
  Datatable,
  ReferenceLineLayerArgs,
  ReferenceLineLayerConfigResult
> = {
  name: REFERENCE_LINE_LAYER,
  aliases: [],
  type: REFERENCE_LINE_LAYER,
  help: i18n.translate('expressionXY.referenceLineLayer.help', {
    defaultMessage: `Configure a reference line in the xy chart`,
  }),
  inputTypes: ['datatable'],
  args: {
    accessors: {
      types: ['string'],
      help: i18n.translate('expressionXY.referenceLineLayer.accessors.help', {
        defaultMessage: 'The columns to display on the y axis.',
      }),
      multi: true,
    },
    yConfig: {
      types: [EXTENDED_Y_CONFIG],
      help: i18n.translate('expressionXY.referenceLineLayer.yConfig.help', {
        defaultMessage: 'Additional configuration for y axes',
      }),
      multi: true,
    },
    columnToLabel: {
      types: ['string'],
      help: i18n.translate('expressionXY.referenceLineLayer.columnToLabel.help', {
        defaultMessage: 'JSON key-value pairs of column ID to label',
      }),
    },
  },
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
