/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { Labels } from '@kbn/charts-plugin/public';
import type {
  ExpressionFunctionDefinition,
  Datatable,
  ExpressionValueBoxed,
} from '@kbn/expressions-plugin/public';

export type ExpressionValueLabel = ExpressionValueBoxed<
  'label',
  {
    color?: Labels['color'];
    filter?: Labels['filter'];
    overwriteColor?: Labels['overwriteColor'];
    rotate?: Labels['rotate'];
    show?: Labels['show'];
    truncate?: Labels['truncate'];
  }
>;

export const label = (): ExpressionFunctionDefinition<
  'label',
  Datatable | null,
  Labels,
  ExpressionValueLabel
> => ({
  name: 'label',
  help: i18n.translate('visTypeXy.function.label.help', {
    defaultMessage: 'Generates label object',
  }),
  type: 'label',
  args: {
    color: {
      types: ['string'],
      help: i18n.translate('visTypeXy.function.label.color.help', {
        defaultMessage: 'Color of label',
      }),
    },
    filter: {
      types: ['boolean'],
      help: i18n.translate('visTypeXy.function.label.filter.help', {
        defaultMessage: 'Hides overlapping labels and duplicates on axis',
      }),
    },
    overwriteColor: {
      types: ['boolean'],
      help: i18n.translate('visTypeXy.function.label.overwriteColor.help', {
        defaultMessage: 'Overwrite color',
      }),
    },
    rotate: {
      types: ['number'],
      help: i18n.translate('visTypeXy.function.label.rotate.help', {
        defaultMessage: 'Rotate angle',
      }),
    },
    show: {
      types: ['boolean'],
      help: i18n.translate('visTypeXy.function.label.show.help', {
        defaultMessage: 'Show label',
      }),
    },
    truncate: {
      types: ['number', 'null'],
      help: i18n.translate('visTypeXy.function.label.truncate.help', {
        defaultMessage: 'The number of symbols before truncating',
      }),
    },
  },
  fn: (context, args) => {
    return {
      type: 'label',
      color: args.color,
      filter: args.hasOwnProperty('filter') ? args.filter : undefined,
      overwriteColor: args.overwriteColor,
      rotate: args.rotate,
      show: args.show,
      truncate: args.truncate,
    };
  },
});
