/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type {
  ExpressionFunctionDefinition,
  Datatable,
  ExpressionValueBoxed,
} from '@kbn/expressions-plugin/public';
import type { Scale } from '../types';

export type ExpressionValueScale = ExpressionValueBoxed<
  'vis_scale',
  {
    boundsMargin?: Scale['boundsMargin'];
    defaultYExtents?: Scale['defaultYExtents'];
    max?: Scale['max'];
    min?: Scale['min'];
    mode?: Scale['mode'];
    setYExtents?: Scale['setYExtents'];
    scaleType: Scale['type'];
  }
>;

export const visScale = (): ExpressionFunctionDefinition<
  'visscale',
  Datatable | null,
  Scale,
  ExpressionValueScale
> => ({
  name: 'visscale',
  help: i18n.translate('visTypeXy.function.scale.help', {
    defaultMessage: 'Generates scale object',
  }),
  type: 'vis_scale',
  args: {
    boundsMargin: {
      types: ['number', 'string'],
      help: i18n.translate('visTypeXy.function.scale.boundsMargin.help', {
        defaultMessage: 'Margin of bounds',
      }),
    },
    defaultYExtents: {
      types: ['boolean'],
      help: i18n.translate('visTypeXy.function.scale.defaultYExtents.help', {
        defaultMessage: 'Flag which allows to scale to data bounds',
      }),
    },
    setYExtents: {
      types: ['boolean'],
      help: i18n.translate('visTypeXy.function.scale.setYExtents.help', {
        defaultMessage: 'Flag which allows to set your own extents',
      }),
    },
    max: {
      types: ['number', 'null'],
      help: i18n.translate('visTypeXy.function.scale.max.help', {
        defaultMessage: 'Max value',
      }),
    },
    min: {
      types: ['number', 'null'],
      help: i18n.translate('visTypeXy.function.scale.min.help', {
        defaultMessage: 'Min value',
      }),
    },
    mode: {
      types: ['string'],
      help: i18n.translate('visTypeXy.function.scale.mode.help', {
        defaultMessage: 'Scale mode. Can be normal, percentage, wiggle or silhouette',
      }),
    },
    type: {
      types: ['string'],
      help: i18n.translate('visTypeXy.function.scale.type.help', {
        defaultMessage: 'Scale type. Can be linear, log or square root',
      }),
      required: true,
    },
  },
  fn: (context, args) => {
    return {
      type: 'vis_scale',
      boundsMargin: args.boundsMargin,
      defaultYExtents: args.defaultYExtents,
      setYExtents: args.setYExtents,
      max: args.max,
      min: args.min,
      mode: args.mode,
      scaleType: args.type,
    };
  },
});
