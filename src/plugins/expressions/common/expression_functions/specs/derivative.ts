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
import { Datatable } from '../../expression_types';
import { buildResultColumns, getBucketIdentifier } from './series_calculation_helpers';

export interface DerivativeArgs {
  by?: string[];
  inputColumnId: string;
  outputColumnId: string;
  outputColumnName?: string;
}

export type ExpressionFunctionDerivative = ExpressionFunctionDefinition<
  'derivative',
  Datatable,
  DerivativeArgs,
  Datatable
>;

/**
 * Calculates the derivative of a specified column in the data table.
 *
 * Also supports multiple series in a single data table - use the `by` argument
 * to specify the columns to split the calculation by.
 * For each unique combination of all `by` columns a separate derivative will be calculated.
 * The order of rows won't be changed - this function is not modifying any existing columns, it's only
 * adding the specified `outputColumnId` column to every row of the table without adding or removing rows.
 *
 * Behavior:
 * * Will write the derivative of `inputColumnId` into `outputColumnId`
 * * If provided will use `outputColumnName` as name for the newly created column. Otherwise falls back to `outputColumnId`
 * * Derivative always start with an undefined value for the first row of a series, a cell will contain its own value minus the
 *   value of the previous cell of the same series.
 *
 * Edge cases:
 * * Will return the input table if `inputColumnId` does not exist
 * * Will throw an error if `outputColumnId` exists already in provided data table
 * * If there is no previous row of the current series with a non `null` or `undefined` value, the output cell of the current row
 *   will be set to `undefined`.
 * * If the row value contains `null` or `undefined`, it will be ignored and the output cell will be set to `undefined`
 * * If the value of the previous row of the same series contains `null` or `undefined`, the output cell of the current row will be set to `undefined` as well
 * * For all values besides `null` and `undefined`, the value will be cast to a number before it's used in the
 *   calculation of the current series even if this results in `NaN` (like in case of objects).
 * * To determine separate series defined by the `by` columns, the values of these columns will be cast to strings
 *   before comparison. If the values are objects, the return value of their `toString` method will be used for comparison.
 *   Missing values (`null` and `undefined`) will be treated as empty strings.
 */
export const derivative: ExpressionFunctionDerivative = {
  name: 'derivative',
  type: 'datatable',

  inputTypes: ['datatable'],

  help: i18n.translate('expressions.functions.derivative.help', {
    defaultMessage: 'Calculates the derivative of a column in a data table',
  }),

  args: {
    by: {
      help: i18n.translate('expressions.functions.derivative.args.byHelpText', {
        defaultMessage: 'Column to split the derivative calculation by',
      }),
      multi: true,
      types: ['string'],
      required: false,
    },
    inputColumnId: {
      help: i18n.translate('expressions.functions.derivative.args.inputColumnIdHelpText', {
        defaultMessage: 'Column to calculate the derivative of',
      }),
      types: ['string'],
      required: true,
    },
    outputColumnId: {
      help: i18n.translate('expressions.functions.derivative.args.outputColumnIdHelpText', {
        defaultMessage: 'Column to store the resulting derivative in',
      }),
      types: ['string'],
      required: true,
    },
    outputColumnName: {
      help: i18n.translate('expressions.functions.derivative.args.outputColumnNameHelpText', {
        defaultMessage: 'Name of the column to store the resulting derivative in',
      }),
      types: ['string'],
      required: false,
    },
  },

  fn(input, { by, inputColumnId, outputColumnId, outputColumnName }) {
    const resultColumns = buildResultColumns(
      input,
      outputColumnId,
      inputColumnId,
      outputColumnName
    );

    if (!resultColumns) {
      return input;
    }

    const previousValues: Partial<Record<string, number>> = {};
    return {
      ...input,
      columns: resultColumns,
      rows: input.rows.map((row) => {
        const newRow = { ...row };

        const bucketIdentifier = getBucketIdentifier(row, by);
        const previousValue = previousValues[bucketIdentifier];
        const currentValue = newRow[inputColumnId];

        if (currentValue != null && previousValue != null) {
          newRow[outputColumnId] = Number(currentValue) - previousValue;
        } else {
          newRow[outputColumnId] = undefined;
        }

        if (currentValue != null) {
          previousValues[bucketIdentifier] = Number(currentValue);
        } else {
          previousValues[bucketIdentifier] = undefined;
        }

        return newRow;
      }),
    };
  },
};
