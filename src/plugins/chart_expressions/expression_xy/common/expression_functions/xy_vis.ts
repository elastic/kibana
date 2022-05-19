/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { XyVisFn } from '../types';
import { XY_VIS, REFERENCE_LINE_LAYER, ANNOTATION_LAYER } from '../constants';
import { strings } from '../i18n';
import { commonXYArgs } from './common_xy_args';
import { commonDataLayerArgs } from './common_data_layer_args';

export const xyVisFunction: XyVisFn = {
  name: XY_VIS,
  type: 'render',
  inputTypes: ['datatable'],
  help: strings.getXYHelp(),
  args: {
    ...commonXYArgs,
    ...commonDataLayerArgs,
    xAccessor: {
      types: ['string', 'vis_dimension'],
      help: strings.getXAccessorHelp(),
    },
    splitAccessor: {
      types: ['string', 'vis_dimension'],
      help: strings.getSplitAccessorHelp(),
    },
    accessors: {
      types: ['string', 'vis_dimension'],
      help: strings.getAccessorsHelp(),
      multi: true,
    },
    referenceLineLayers: {
      types: [REFERENCE_LINE_LAYER],
      help: strings.getReferenceLineLayerHelp(),
      multi: true,
    },
    annotationLayers: {
      types: [ANNOTATION_LAYER],
      help: strings.getAnnotationLayerHelp(),
      multi: true,
    },
    splitColumnAccessor: {
      types: ['vis_dimension', 'string'],
      help: strings.getSplitColumnAccessorHelp(),
    },
    splitRowAccessor: {
      types: ['vis_dimension', 'string'],
      help: strings.getSplitRowAccessorHelp(),
    },
    markSizeAccessor: {
      types: ['vis_dimension', 'string'],
      help: strings.getMarkSizeAccessorHelp(),
    },
  },
  async fn(data, args, handlers) {
    const { xyVisFn } = await import('./xy_vis_fn');
    return await xyVisFn(data, args, handlers);
  },
};
