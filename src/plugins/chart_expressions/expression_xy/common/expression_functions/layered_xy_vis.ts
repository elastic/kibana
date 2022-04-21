/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { LayeredXyVisFn } from '../types';
import {
  XY_VIS_RENDERER,
  EXTENDED_DATA_LAYER,
  EXTENDED_REFERENCE_LINE_LAYER,
  LAYERED_XY_VIS,
  EXTENDED_ANNOTATION_LAYER,
} from '../constants';
import { logDatatables } from '../utils';
import { commonXYArgs } from './common_xy_args';
import { strings } from '../i18n';
import { appendLayerIds } from '../helpers';

export const layeredXyVisFunction: LayeredXyVisFn = {
  name: LAYERED_XY_VIS,
  type: 'render',
  inputTypes: ['datatable'],
  help: strings.getXYHelp(),
  args: {
    ...commonXYArgs,
    layers: {
      types: [EXTENDED_DATA_LAYER, EXTENDED_REFERENCE_LINE_LAYER, EXTENDED_ANNOTATION_LAYER],
      help: i18n.translate('expressionXY.layeredXyVis.layers.help', {
        defaultMessage: 'Layers of visual series',
      }),
      multi: true,
    },
  },
  fn(data, args, handlers) {
    const layers = appendLayerIds(args.layers ?? [], 'layers');

    logDatatables(layers, handlers);

    return {
      type: 'render',
      as: XY_VIS_RENDERER,
      value: {
        args: {
          ...args,
          layers,
          ariaLabel:
            args.ariaLabel ??
            (handlers.variables?.embeddableTitle as string) ??
            handlers.getExecutionContext?.()?.description,
        },
      },
    };
  },
};
