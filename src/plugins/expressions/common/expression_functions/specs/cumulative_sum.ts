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

  fn(input, { by, inputColumnId, outputColumnId, outputColumnName }) {
    if (input.columns.some((column) => column.id === outputColumnId)) {
      throw new Error(
        i18n.translate('expressions.functions.cumulativeSum.columnConflictMessage', {
          defaultMessage:
            'Specified outputColumnId {columnId} already exists. Please pick another column id.',
          values: {
            columnId: outputColumnId,
          },
        })
      );
    }

    const inputColumnDefinition = input.columns.find((column) => column.id === inputColumnId);

    if (!inputColumnDefinition) {
      return input;
    }

    const outputColumnDefinition = {
      ...inputColumnDefinition,
      id: outputColumnId,
      name: outputColumnName || outputColumnId,
    };

    const resultColumns = [...input.columns];
    // add output column after input column in the table
    resultColumns.splice(
      resultColumns.indexOf(inputColumnDefinition) + 1,
      0,
      outputColumnDefinition
    );

    const accumulators: Partial<Record<string, number>> = {};
    return {
      ...input,
      columns: resultColumns,
      rows: input.rows.map((row) => {
        const newRow = { ...row };

        const bucketIdentifier = getBucketIdentifier(row, by);
        const accumulatorValue = accumulators[bucketIdentifier] ?? 0;
        const currentValue = newRow[inputColumnId];
        if (currentValue != null) {
          newRow[outputColumnId] = Number(currentValue) + accumulatorValue;
          accumulators[bucketIdentifier] = newRow[outputColumnId];
        } else {
          newRow[outputColumnId] = accumulatorValue;
        }

        return newRow;
      }),
    };
  },
};
