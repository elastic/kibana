/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition } from '../types';
import { Datatable } from '../../expression_types';

export interface CumulativeSumArgs {
  by?: string[];
  inputColumnId: string;
  outputColumnId: string;
  outputColumnName?: string;
}

export type ExpressionFunctionCumulativeSum = ExpressionFunctionDefinition<
  'cumulative_sum',
  Datatable,
  CumulativeSumArgs,
  Promise<Datatable>
>;

/**
 * Calculates the cumulative sum of a specified column in the data table.
 *
 * Also supports multiple series in a single data table - use the `by` argument
 * to specify the columns to split the calculation by.
 * For each unique combination of all `by` columns a separate cumulative sum will be calculated.
 * The order of rows won't be changed - this function is not modifying any existing columns, it's only
 * adding the specified `outputColumnId` column to every row of the table without adding or removing rows.
 *
 * Behavior:
 * * Will write the cumulative sum of `inputColumnId` into `outputColumnId`
 * * If provided will use `outputColumnName` as name for the newly created column. Otherwise falls back to `outputColumnId`
 * * Cumulative sums always start with 0, a cell will contain its own value plus the values of
 *   all cells of the same series further up in the table.
 *
 * Edge cases:
 * * Will return the input table if `inputColumnId` does not exist
 * * Will throw an error if `outputColumnId` exists already in provided data table
 * * If the row value contains `null` or `undefined`, it will be ignored and overwritten with the cumulative sum of
 *   all cells of the same series further up in the table.
 * * For all values besides `null` and `undefined`, the value will be cast to a number before it's added to the
 *   cumulative sum of the current series - if this results in `NaN` (like in case of objects), all cells of the
 *   current series will be set to `NaN`.
 * * To determine separate series defined by the `by` columns, the values of these columns will be cast to strings
 *   before comparison. If the values are objects, the return value of their `toString` method will be used for comparison.
 *   Missing values (`null` and `undefined`) will be treated as empty strings.
 */
export const cumulativeSum: ExpressionFunctionCumulativeSum = {
  name: 'cumulative_sum',
  type: 'datatable',

  inputTypes: ['datatable'],

  help: i18n.translate('expressions.functions.cumulativeSum.help', {
    defaultMessage: 'Calculates the cumulative sum of a column in a data table',
  }),

  args: {
    by: {
      help: i18n.translate('expressions.functions.cumulativeSum.args.byHelpText', {
        defaultMessage: 'Column to split the cumulative sum calculation by',
      }),
      multi: true,
      types: ['string'],
      required: false,
    },
    inputColumnId: {
      help: i18n.translate('expressions.functions.cumulativeSum.args.inputColumnIdHelpText', {
        defaultMessage: 'Column to calculate the cumulative sum of',
      }),
      types: ['string'],
      required: true,
    },
    outputColumnId: {
      help: i18n.translate('expressions.functions.cumulativeSum.args.outputColumnIdHelpText', {
        defaultMessage: 'Column to store the resulting cumulative sum in',
      }),
      types: ['string'],
      required: true,
    },
    outputColumnName: {
      help: i18n.translate('expressions.functions.cumulativeSum.args.outputColumnNameHelpText', {
        defaultMessage: 'Name of the column to store the resulting cumulative sum in',
      }),
      types: ['string'],
      required: false,
    },
  },

  async fn(input, args) {
    const { cumulativeSumFn } = await import('./cumulative_sum_fn');
    return cumulativeSumFn(input, args);
  },
};
