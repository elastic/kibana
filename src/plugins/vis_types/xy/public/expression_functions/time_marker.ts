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
import type { TimeMarker } from '../types';

export type ExpressionValueTimeMarker = ExpressionValueBoxed<
  'time_marker',
  {
    time: string;
    class?: string;
    color?: string;
    opacity?: number;
    width?: number;
  }
>;

export const timeMarker = (): ExpressionFunctionDefinition<
  'timemarker',
  Datatable | null,
  TimeMarker,
  ExpressionValueTimeMarker
> => ({
  name: 'timemarker',
  help: i18n.translate('visTypeXy.function.timemarker.help', {
    defaultMessage: 'Generates time marker object',
  }),
  type: 'time_marker',
  args: {
    time: {
      types: ['string'],
      help: i18n.translate('visTypeXy.function.timeMarker.time.help', {
        defaultMessage: 'Exact Time',
      }),
      required: true,
    },
    class: {
      types: ['string'],
      help: i18n.translate('visTypeXy.function.timeMarker.class.help', {
        defaultMessage: 'Css class name',
      }),
    },
    color: {
      types: ['string'],
      help: i18n.translate('visTypeXy.function.timeMarker.color.help', {
        defaultMessage: 'Color of time marker',
      }),
    },
    opacity: {
      types: ['number'],
      help: i18n.translate('visTypeXy.function.timeMarker.opacity.help', {
        defaultMessage: 'Opacity of time marker',
      }),
    },
    width: {
      types: ['number'],
      help: i18n.translate('visTypeXy.function.timeMarker.width.help', {
        defaultMessage: 'Width of time marker',
      }),
    },
  },
  fn: (context, args) => {
    return {
      type: 'time_marker',
      time: args.time,
      class: args.class,
      color: args.color,
      opacity: args.opacity,
      width: args.width,
    };
  },
});
