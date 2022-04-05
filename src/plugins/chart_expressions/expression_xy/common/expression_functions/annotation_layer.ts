/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { Datatable, ExpressionFunctionDefinition } from '../../../../expressions/common';
import { LayerTypes, ANNOTATION_LAYER } from '../constants';
import { AnnotationLayerArgs, AnnotationLayerConfigResult } from '../types';

export function annotationLayerFunction(): ExpressionFunctionDefinition<
  typeof ANNOTATION_LAYER,
  Datatable,
  AnnotationLayerArgs,
  AnnotationLayerConfigResult
> {
  return {
    name: ANNOTATION_LAYER,
    aliases: [],
    type: ANNOTATION_LAYER,
    inputTypes: ['datatable'],
    help: i18n.translate('expressionXY.annotationLayer.help', {
      defaultMessage: `Configure an annotation layer in the xy chart`,
    }),
    args: {
      hide: {
        types: ['boolean'],
        default: false,
        help: i18n.translate('expressionXY.annotationLayer.hide.help', {
          defaultMessage: 'Show / hide details',
        }),
      },
      annotations: {
        types: ['manual_event_annotation'],
        help: i18n.translate('expressionXY.annotationLayer.annotations.help', {
          defaultMessage: 'Annotationss',
        }),
        multi: true,
      },
    },
    fn: (input, args) => {
      return {
        type: ANNOTATION_LAYER,
        ...args,
        annotations: args.annotations ?? [],
        layerType: LayerTypes.ANNOTATIONS,
        table: input,
      };
    },
  };
}
