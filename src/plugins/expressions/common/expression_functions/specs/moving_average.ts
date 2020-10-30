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

export interface MovingAverageArgs {
  by?: string[];
  inputColumnId: string;
  outputColumnId: string;
  outputColumnName?: string;
  window?: number;
}

export type ExpressionFunctionMovingAverage = ExpressionFunctionDefinition<
  'movingAverage',
  Datatable,
  MovingAverageArgs,
  Datatable
>;

/**
 * Calculates the movingAverage of a specified column in the data table.
 *
 * Also supports multiple series in a single data table - use the `by` argument
 * to specify the columns to split the calculation by.
 * For each unique combination of all `by` columns a separate movingAverage will be calculated.
 * The order of rows won't be changed - this function is not modifying any existing columns, it's only
 * adding the specified `outputColumnId` column to every row of the table without adding or removing rows.
 *
 * Behavior:
 * * Will write the movingAverage of `inputColumnId` into `outputColumnId`
 * * If provided will use `outputColumnName` as name for the newly created column. Otherwise falls back to `outputColumnId`
 * * MovingAverage always starts with an undefined value for the first row of a series. Each next cell will contain sum of the last
 * * [window] of values divided by [window], not including the value of the row.
 *
 * Edge cases:
 * * Will return the input table if `inputColumnId` does not exist
 * * Will throw an error if `outputColumnId` exists already in provided data table
 * * If any value of the previous [window] values of the same series equals to `null` or `undefined`, it will be skipped in calculation.
 * * If all of the last [window] values are equal to `null` or `undefined`, moving average will be set to undefined too.
 * * For all values besides `null` and `undefined`, the value will be cast to a number before it's used in the
 *   calculation of the current series even if this results in `NaN` (like in case of objects).
 * * To determine separate series defined by the `by` columns, the values of these columns will be cast to strings
 *   before comparison. If the values are objects, the return value of their `toString` method will be used for comparison.
 */
export const movingAverage: ExpressionFunctionMovingAverage = {
  name: 'movingAverage',
  type: 'datatable',

  inputTypes: ['datatable'],

  help: i18n.translate('expressions.functions.movingAverage.help', {
    defaultMessage: 'Calculates the movingAverage of a column in a data table',
  }),

  args: {
    by: {
      help: i18n.translate('expressions.functions.movingAverage.args.byHelpText', {
        defaultMessage: 'Column to split the movingAverage calculation by',
      }),
      multi: true,
      types: ['string'],
      required: false,
    },
    inputColumnId: {
      help: i18n.translate('expressions.functions.movingAverage.args.inputColumnIdHelpText', {
        defaultMessage: 'Column to calculate the movingAverage of',
      }),
      types: ['string'],
      required: true,
    },
    outputColumnId: {
      help: i18n.translate('expressions.functions.movingAverage.args.outputColumnIdHelpText', {
        defaultMessage: 'Column to store the resulting movingAverage in',
      }),
      types: ['string'],
      required: true,
    },
    outputColumnName: {
      help: i18n.translate('expressions.functions.movingAverage.args.outputColumnNameHelpText', {
        defaultMessage: 'Name of the column to store the resulting movingAverage in',
      }),
      types: ['string'],
      required: false,
    },
    window: {
      help: i18n.translate('expressions.functions.movingAverage.args.windowHelpText', {
        defaultMessage: 'The size of window to "slide" across the histogram.',
      }),
      types: ['number'],
      required: false,
      default: 5,
    },
  },

  fn(input, { by, inputColumnId, outputColumnId, outputColumnName, window = 5 }) {
    const resultColumns = buildResultColumns(
      input,
      outputColumnId,
      inputColumnId,
      outputColumnName
    );

    if (!resultColumns) {
      return input;
    }

    const lastNValuesByBucket: Partial<Record<string, Array<number | undefined>>> = {};
    const a = {
      ...input,
      columns: resultColumns,
      rows: input.rows.map((row) => {
        const newRow = { ...row };

        const bucketIdentifier = getBucketIdentifier(row, by);
        const lastNValues = lastNValuesByBucket[bucketIdentifier];
        const currentValue = newRow[inputColumnId];
        const sanitizedLastNValues = lastNValues?.filter((v) => v != null) as number[];

        if (sanitizedLastNValues != null && sanitizedLastNValues.length) {
          const sanitizedSum = sanitizedLastNValues.reduce(
            (acc: number, current: number) => acc + current,
            0
          );
          newRow[outputColumnId] = sanitizedSum / sanitizedLastNValues.length;
        } else {
          newRow[outputColumnId] = undefined;
        }

        if (currentValue != null && lastNValues != null) {
          lastNValuesByBucket[bucketIdentifier] = [...lastNValues, Number(currentValue)].slice(
            -window
          );
        } else if (currentValue != null) {
          lastNValuesByBucket[bucketIdentifier] = [Number(currentValue)];
        } else if (lastNValues != null) {
          lastNValuesByBucket[bucketIdentifier] = [...lastNValues, undefined].slice(-window);
        } else {
          lastNValuesByBucket[bucketIdentifier] = undefined;
        }
        return newRow;
      }),
    };
    // console.log(a);
    return a;
  },
};
