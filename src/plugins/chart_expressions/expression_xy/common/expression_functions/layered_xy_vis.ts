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
  REFERENCE_LINE,
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
      types: [EXTENDED_DATA_LAYER, REFERENCE_LINE_LAYER, REFERENCE_LINE],
      help: i18n.translate('expressionXY.layeredXyVis.layers.help', {
        defaultMessage: 'Layers of visual series',
      }),
      multi: true,
    },
    annotations: {
      types: ['event_annotations_result'],
      help: i18n.translate('expressionXY.layeredXyVis.annotations.help', {
        defaultMessage: 'Annotations',
      }),
    },
    splitColumnAccessor: {
      types: ['vis_dimension', 'string'],
      help: strings.getSplitColumnAccessorHelp(),
    },
    splitRowAccessor: {
      types: ['vis_dimension', 'string'],
      help: strings.getSplitRowAccessorHelp(),
    },
    singleTable: {
      types: ['boolean'],
      help: i18n.translate('expressionXY.layeredXyVis.singleTable.help', {
        defaultMessage: 'All layers use the one datatable',
      }),
      default: false,
    },
  },
  async fn(data, args, handlers) {
    const { layeredXyVisFn } = await import('./layered_xy_vis_fn');
    return await layeredXyVisFn(data, args, handlers);
  },
};
