/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Datatable } from '../../expression_types';
import { buildResultColumns, getBucketIdentifier } from '../series_calculation_helpers';
import { MovingAverageArgs } from './moving_average';

/**
 * Calculates the moving average of a specified column in the data table.
 *
 * Also supports multiple series in a single data table - use the `by` argument
 * to specify the columns to split the calculation by.
 * For each unique combination of all `by` columns a separate moving average will be calculated.
 * The order of rows won't be changed - this function is not modifying any existing columns, it's only
 * adding the specified `outputColumnId` column to every row of the table without adding or removing rows.
 *
 * Behavior:
 * * Will write the moving average of `inputColumnId` into `outputColumnId`
 * * If provided will use `outputColumnName` as name for the newly created column. Otherwise falls back to `outputColumnId`
 * * Moving average always starts with an undefined value for the first row of a series. Each next cell will contain sum of the last
 * * [window] of values divided by [window] excluding the current bucket.
 * If either of window edges moves outside the borders of data series, the window shrinks to include available values only.
 *
 * Edge cases:
 * * Will return the input table if `inputColumnId` does not exist
 * * Will throw an error if `outputColumnId` exists already in provided data table
 * * If null or undefined value is encountered, skip the current row and do not change the window
 * * For all values besides `null` and `undefined`, the value will be cast to a number before it's used in the
 *   calculation of the current series even if this results in `NaN` (like in case of objects).
 * * To determine separate series defined by the `by` columns, the values of these columns will be cast to strings
 *   before comparison. If the values are objects, the return value of their `toString` method will be used for comparison.
 */
export const movingAverageFn = (
  input: Datatable,
  { by, inputColumnId, outputColumnId, outputColumnName, window }: MovingAverageArgs
): Datatable => {
  const resultColumns = buildResultColumns(input, outputColumnId, inputColumnId, outputColumnName);

  if (!resultColumns) {
    return input;
  }

  const lastNValuesByBucket: Partial<Record<string, number[]>> = {};
  return {
    ...input,
    columns: resultColumns,
    rows: input.rows.map((row) => {
      const newRow = { ...row };
      const bucketIdentifier = getBucketIdentifier(row, by);
      const lastNValues = lastNValuesByBucket[bucketIdentifier];
      const currentValue = newRow[inputColumnId];
      if (lastNValues != null && currentValue != null) {
        const sum = lastNValues.reduce((acc, current) => acc + current, 0);
        newRow[outputColumnId] = sum / lastNValues.length;
      } else {
        newRow[outputColumnId] = undefined;
      }

      if (currentValue != null) {
        lastNValuesByBucket[bucketIdentifier] = [
          ...(lastNValues || []),
          Number(currentValue),
        ].slice(-window);
      }

      return newRow;
    }),
  };
};
