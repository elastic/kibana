/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

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
    },
    fn: (input, args) => {
      return {
        type: ANNOTATION_LAYER,
        ...args,
        layerType: LayerTypes.ANNOTATIONS,
        table: input,
      };
    },
  };
}
