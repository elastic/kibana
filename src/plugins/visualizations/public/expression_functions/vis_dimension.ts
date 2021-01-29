/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import {
  ExpressionFunctionDefinition,
  ExpressionValueBoxed,
  Datatable,
  DatatableColumn,
} from '../../../expressions/public';

interface Arguments {
  accessor: string | number;
  format?: string;
  formatParams?: string;
}

type ExpressionValueVisDimension = ExpressionValueBoxed<
  'vis_dimension',
  {
    accessor: number | DatatableColumn;
    format: {
      id?: string;
      params: unknown;
    };
  }
>;

export const visDimension = (): ExpressionFunctionDefinition<
  'visdimension',
  Datatable,
  Arguments,
  ExpressionValueVisDimension
> => ({
  name: 'visdimension',
  help: i18n.translate('visualizations.function.visDimension.help', {
    defaultMessage: 'Generates visConfig dimension object',
  }),
  type: 'vis_dimension',
  inputTypes: ['datatable'],
  args: {
    accessor: {
      types: ['string', 'number'],
      aliases: ['_'],
      help: i18n.translate('visualizations.function.visDimension.accessor.help', {
        defaultMessage: 'Column in your dataset to use (either column index or column name)',
      }),
    },
    format: {
      types: ['string'],
      default: 'string',
      help: i18n.translate('visualizations.function.visDimension.format.help', {
        defaultMessage: 'Format',
      }),
    },
    formatParams: {
      types: ['string'],
      default: '"{}"',
      help: i18n.translate('visualizations.function.visDimension.formatParams.help', {
        defaultMessage: 'Format params',
      }),
    },
  },
  fn: (input, args) => {
    const accessor =
      typeof args.accessor === 'number'
        ? args.accessor
        : input.columns.find((c) => c.id === args.accessor);

    if (accessor === undefined) {
      throw new Error(
        i18n.translate('visualizations.function.visDimension.error.accessor', {
          defaultMessage: 'Column name provided is invalid',
        })
      );
    }

    return {
      type: 'vis_dimension',
      accessor,
      format: {
        id: args.format,
        params: JSON.parse(args.formatParams!),
      },
    };
  },
});
