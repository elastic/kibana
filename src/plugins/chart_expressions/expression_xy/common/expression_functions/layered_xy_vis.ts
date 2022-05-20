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
  EXTENDED_DATA_LAYER,
  REFERENCE_LINE_LAYER,
  LAYERED_XY_VIS,
  EXTENDED_ANNOTATION_LAYER,
} from '../constants';
import { commonXYArgs } from './common_xy_args';
import { strings } from '../i18n';

export const layeredXyVisFunction: LayeredXyVisFn = {
  name: LAYERED_XY_VIS,
  type: 'render',
  inputTypes: ['datatable'],
  help: strings.getXYHelp(),
  args: {
    ...commonXYArgs,
    layers: {
      types: [EXTENDED_DATA_LAYER, REFERENCE_LINE_LAYER, EXTENDED_ANNOTATION_LAYER],
      help: i18n.translate('expressionXY.layeredXyVis.layers.help', {
        defaultMessage: 'Layers of visual series',
      }),
      multi: true,
    },
  },
  async fn(data, args, handlers) {
    const { layeredXyVisFn } = await import('./layered_xy_vis_fn');
    return await layeredXyVisFn(data, args, handlers);
  },
};
