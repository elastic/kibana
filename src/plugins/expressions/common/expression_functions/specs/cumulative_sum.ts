/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition } from '../types';
import { Datatable, DatatableRow } from '../../expression_types';

export type ExpressionFunctionCumulativeSum = ExpressionFunctionDefinition<
  'cumulative_sum',
  Datatable,
  { by?: string[]; column: string },
  Datatable
>;

/**
 * Returns a string identifying the group of a row by a list of columns to group by
 */
function getBucketIdentifier(row: DatatableRow, groupColumns?: string[]) {
  return (groupColumns || [])
    .map((groupColumnId) => (row[groupColumnId] == null ? '' : String(row[groupColumnId])))
    .join('|');
}

/**
 * Calculates the cumulative sum of a specified column in the data table.
 *
 * Also supports multiple series in a single data table - use the `by` argument
 * to specify the columns to split the calculation by.
 * For each unique combination of all `by` columns a separate cumulative sum will be calculated.
 * The order of rows won't be changed - this function is not adding or removing rows and columns,
 * it's only changes the values of the column specified by the `column` argument.
 *
 * Behavior:
 * * Will overwrite the specified column with the cumulative sum.
 * * Cumulative sums always start with 0, a cell will contain its own value plus the values of
 *   all cells of the same series further up in the table.
 *
 * Edge cases:
 * * If `column` contains `null` or `undefined`, it will be ignored and overwritten with the cumulative sum of
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
    },
    column: {
      help: i18n.translate('expressions.functions.cumulativeSum.args.columnHelpText', {
        defaultMessage: 'Column to calculate the cumulative sum of',
      }),
      types: ['string'],
    },
  },

  fn(input, { by, column }) {
    const accumulators: Partial<Record<string, number>> = {};
    return {
      ...input,
      rows: input.rows.map((row) => {
        const newRow = { ...row };

        const bucketIdentifier = getBucketIdentifier(row, by);
        const accumulatorValue = accumulators[bucketIdentifier] ?? 0;
        const currentValue = newRow[column];
        if (currentValue != null) {
          newRow[column] = Number(newRow[column]) + accumulatorValue;
          accumulators[bucketIdentifier] = newRow[column];
        } else {
          newRow[column] = accumulatorValue;
        }

        return newRow;
      }),
    };
  },
};
