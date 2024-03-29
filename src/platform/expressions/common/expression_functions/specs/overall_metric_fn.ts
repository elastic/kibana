/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Datatable } from '../../expression_types';
import { buildResultColumns, getBucketIdentifier } from '../series_calculation_helpers';
import { OverallMetricArgs } from './overall_metric';

function getValueAsNumberArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((innerVal) => Number(innerVal));
  } else {
    return [Number(value)];
  }
}

/**
 * Calculates the overall metric of a specified column in the data table.
 *
 * Also supports multiple series in a single data table - use the `by` argument
 * to specify the columns to split the calculation by.
 * For each unique combination of all `by` columns a separate overall metric will be calculated.
 * The order of rows won't be changed - this function is not modifying any existing columns, it's only
 * adding the specified `outputColumnId` column to every row of the table without adding or removing rows.
 *
 * Behavior:
 * * Will write the overall metric of `inputColumnId` into `outputColumnId`
 * * If provided will use `outputColumnName` as name for the newly created column. Otherwise falls back to `outputColumnId`
 * * Each cell will contain the calculated metric based on the values of all cells belonging to the current series.
 *
 * Edge cases:
 * * Will return the input table if `inputColumnId` does not exist
 * * Will throw an error if `outputColumnId` exists already in provided data table
 * * If the row value contains `null` or `undefined`, it will be ignored and overwritten with the overall metric of
 *   all cells of the same series.
 * * For all values besides `null` and `undefined`, the value will be cast to a number before it's added to the
 *   overall metric of the current series - if this results in `NaN` (like in case of objects), all cells of the
 *   current series will be set to `NaN`.
 * * To determine separate series defined by the `by` columns, the values of these columns will be cast to strings
 *   before comparison. If the values are objects, the return value of their `toString` method will be used for comparison.
 *   Missing values (`null` and `undefined`) will be treated as empty strings.
 */
export const overallMetricFn = (
  input: Datatable,
  { by, inputColumnId, outputColumnId, outputColumnName, metric }: OverallMetricArgs
): Datatable => {
  const resultColumns = buildResultColumns(input, outputColumnId, inputColumnId, outputColumnName);

  if (!resultColumns) {
    return input;
  }

  const accumulators: Partial<Record<string, number>> = {};
  const valueCounter: Partial<Record<string, number>> = {};
  input.rows.forEach((row) => {
    const bucketIdentifier = getBucketIdentifier(row, by);
    const accumulatorValue = accumulators[bucketIdentifier];

    const currentValue = row[inputColumnId];
    if (currentValue != null) {
      const currentNumberValues = getValueAsNumberArray(currentValue);
      switch (metric) {
        case 'average':
          valueCounter[bucketIdentifier] =
            (valueCounter[bucketIdentifier] ?? 0) + currentNumberValues.length;
        case 'sum':
          accumulators[bucketIdentifier] = currentNumberValues.reduce(
            (a, b) => a + b,
            accumulatorValue || 0
          );
          break;
        case 'min':
          if (typeof accumulatorValue !== 'undefined') {
            accumulators[bucketIdentifier] = Math.min(accumulatorValue, ...currentNumberValues);
          } else {
            accumulators[bucketIdentifier] = Math.min(...currentNumberValues);
          }
          break;
        case 'max':
          if (typeof accumulatorValue !== 'undefined') {
            accumulators[bucketIdentifier] = Math.max(accumulatorValue, ...currentNumberValues);
          } else {
            accumulators[bucketIdentifier] = Math.max(...currentNumberValues);
          }
          break;
      }
    }
  });
  if (metric === 'average') {
    Object.keys(accumulators).forEach((bucketIdentifier) => {
      const accumulatorValue = accumulators[bucketIdentifier];
      const valueCount = valueCounter[bucketIdentifier];
      if (typeof accumulatorValue !== 'undefined' && typeof valueCount !== 'undefined') {
        accumulators[bucketIdentifier] = accumulatorValue / valueCount;
      }
    });
  }
  return {
    ...input,
    columns: resultColumns,
    rows: input.rows.map((row) => {
      const newRow = { ...row };
      const bucketIdentifier = getBucketIdentifier(row, by);
      newRow[outputColumnId] = accumulators[bucketIdentifier];

      return newRow;
    }),
  };
};
