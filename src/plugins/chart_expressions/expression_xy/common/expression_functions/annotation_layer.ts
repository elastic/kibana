/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Datatable, ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import { LayerTypes, ANNOTATION_LAYER } from '../constants';
import { AnnotationLayerArgs, AnnotationLayerConfigResult } from '../types';
import { strings } from '../i18n';

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
    help: strings.getAnnotationLayerFnHelp(),
    args: {
      layerId: {
        types: ['string'],
        help: strings.getLayerIdHelp(),
      },
      simpleView: {
        types: ['boolean'],
        default: false,
        help: strings.getAnnotationLayerSimpleViewHelp(),
      },
      annotations: {
        types: [
          'manual_point_event_annotation',
          'manual_range_event_annotation',
          'query_point_event_annotation',
        ],
        help: strings.getAnnotationLayerAnnotationsHelp(),
        multi: true,
      },
    },
    fn: (input, args) => {
      return {
        type: ANNOTATION_LAYER,
        ...args,
        annotations: args.annotations ?? [],
        layerType: LayerTypes.ANNOTATIONS,
      };
    },
  };
}
