/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LayerTypes, EXTENDED_ANNOTATION_LAYER } from '../constants';
import { ExtendedAnnotationLayerFn } from '../types';
import { strings } from '../i18n';

export function extendedAnnotationLayerFunction(): ExtendedAnnotationLayerFn {
  return {
    name: EXTENDED_ANNOTATION_LAYER,
    aliases: [],
    type: EXTENDED_ANNOTATION_LAYER,
    inputTypes: ['null'],
    help: strings.getAnnotationLayerFnHelp(),
    args: {
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
