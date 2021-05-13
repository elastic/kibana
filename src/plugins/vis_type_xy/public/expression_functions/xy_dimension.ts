/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { ExpressionValueVisDimension } from '../../../visualizations/public';
import type {
  ExpressionFunctionDefinition,
  Datatable,
  ExpressionValueBoxed,
} from '../../../expressions/public';
import type { Dimension } from '../types';

interface Arguments {
  visDimension: ExpressionValueVisDimension;
  params: string;
  aggType: string;
  label: string;
}

export type ExpressionValueXYDimension = ExpressionValueBoxed<
  'xy_dimension',
  {
    label: string;
    aggType: string;
    params: Dimension['params'];
    accessor: number;
    format: Dimension['format'];
  }
>;

export const xyDimension = (): ExpressionFunctionDefinition<
  'xydimension',
  Datatable | null,
  Arguments,
  ExpressionValueXYDimension
> => ({
  name: 'xydimension',
  help: i18n.translate('visTypeXy.function.xydimension.help', {
    defaultMessage: 'Generates xy dimension object',
  }),
  type: 'xy_dimension',
  args: {
    visDimension: {
      types: ['vis_dimension'],
      help: i18n.translate('visTypeXy.function.xyDimension.visDimension.help', {
        defaultMessage: 'Dimension object config',
      }),
      required: true,
    },
    label: {
      types: ['string'],
      help: i18n.translate('visTypeXy.function.xyDimension.label.help', {
        defaultMessage: 'Label',
      }),
    },
    aggType: {
      types: ['string'],
      help: i18n.translate('visTypeXy.function.xyDimension.aggType.help', {
        defaultMessage: 'Aggregation type',
      }),
    },
    params: {
      types: ['string'],
      default: '"{}"',
      help: i18n.translate('visTypeXy.function.xyDimension.params.help', {
        defaultMessage: 'Params',
      }),
    },
  },
  fn: (context, args) => {
    return {
      type: 'xy_dimension',
      label: args.label,
      aggType: args.aggType,
      params: JSON.parse(args.params!),
      accessor: args.visDimension.accessor as number,
      format: args.visDimension.format,
    };
  },
});
