/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { Datatable, ExpressionFunctionDefinition } from '../../../../expressions/common';
import { LayerTypes, EXTENDED_ANNOTATION_LAYER } from '../constants';
import { ExtendedAnnotationLayerArgs, ExtendedAnnotationLayerConfigResult } from '../types';

export function extendedAnnotationLayerFunction(): ExpressionFunctionDefinition<
  typeof EXTENDED_ANNOTATION_LAYER,
  Datatable,
  ExtendedAnnotationLayerArgs,
  ExtendedAnnotationLayerConfigResult
> {
  return {
    name: EXTENDED_ANNOTATION_LAYER,
    aliases: [],
    type: EXTENDED_ANNOTATION_LAYER,
    inputTypes: ['datatable'],
    help: 'Annotation layer in lens',
    args: {
      hide: {
        types: ['boolean'],
        default: false,
        help: 'Show details',
      },
      annotations: {
        types: ['manual_event_annotation'],
        help: '',
        multi: true,
      },
      table: {
        types: ['datatable'],
        help: i18n.translate('expressionXY.dataLayer.table.help', {
          defaultMessage: 'Table',
        }),
      },
    },
    fn: (input, args) => {
      return {
        type: EXTENDED_ANNOTATION_LAYER,
        ...args,
        layerType: LayerTypes.ANNOTATIONS,
        table: args.table ?? input,
      };
    },
  };
}
