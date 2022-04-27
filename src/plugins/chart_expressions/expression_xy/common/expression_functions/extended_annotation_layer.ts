/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Datatable, ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import { LayerTypes, EXTENDED_ANNOTATION_LAYER } from '../constants';
import { ExtendedAnnotationLayerConfigResult, ExtendedAnnotationLayerArgs } from '../types';
import { strings } from '../i18n';

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
    help: strings.getAnnotationLayerFnHelp(),
    args: {
      hide: {
        types: ['boolean'],
        default: false,
        help: strings.getAnnotationLayerHideHelp(),
      },
      annotations: {
        types: ['manual_event_annotation'],
        help: strings.getAnnotationLayerAnnotationsHelp(),
        multi: true,
      },
      layerId: {
        types: ['string'],
        help: strings.getLayerIdHelp(),
      },
    },
    fn: (input, args) => {
      return {
        type: EXTENDED_ANNOTATION_LAYER,
        ...args,
        annotations: args.annotations ?? [],
        layerType: LayerTypes.ANNOTATIONS,
      };
    },
  };
}
