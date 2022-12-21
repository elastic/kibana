/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Datatable } from '../../expression_types';
import { buildResultColumns, getBucketIdentifier } from '../series_calculation_helpers';
import { CumulativeSumArgs } from './cumulative_sum';

export const cumulativeSumFn = (
  input: Datatable,
  { by, inputColumnId, outputColumnId, outputColumnName }: CumulativeSumArgs
): Datatable => {
  const resultColumns = buildResultColumns(input, outputColumnId, inputColumnId, outputColumnName);

  if (!resultColumns) {
    return input;
  }

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
};
