/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { Datatable, DatatableRow } from '../expression_types';

/**
 * Returns a string identifying the group of a row by a list of columns to group by
 */
export function getBucketIdentifier(row: DatatableRow, groupColumns?: string[]) {
  return (groupColumns || [])
    .map((groupColumnId) => (row[groupColumnId] == null ? '' : String(row[groupColumnId])))
    .join('|');
}

/**
 * Checks whether input and output columns are defined properly
 * and builds column array of the output table if that's the case.
 *
 * * Throws an error if the output column exists already.
 * * Returns undefined if the input column doesn't exist.
 * @param input Input datatable
 * @param outputColumnId Id of the output column
 * @param inputColumnId Id of the input column
 * @param outputColumnName Optional name of the output column
 * @param options Optional options, set `allowColumnOverwrite` to true to not raise an exception if the output column exists already
 */
export function buildResultColumns(
  input: Datatable,
  outputColumnId: string,
  inputColumnId: string,
  outputColumnName: string | undefined,
  options: { allowColumnOverwrite: boolean } = { allowColumnOverwrite: false }
) {
  if (
    !options.allowColumnOverwrite &&
    input.columns.some((column) => column.id === outputColumnId)
  ) {
    throw new Error(
      i18n.translate('expressions.functions.seriesCalculations.columnConflictMessage', {
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
    return;
  }

  const outputColumnDefinition = {
    ...inputColumnDefinition,
    id: outputColumnId,
    name: outputColumnName || outputColumnId,
  };

  const resultColumns = [...input.columns];

  // If input and output are the same, replace the input column with the output one
  // otherwise add output column after input column in the table
  const offset = inputColumnId === outputColumnId ? 0 : 1;
  // replace 1 item in case of same column, otherwise just append
  const replacingItems = inputColumnId === outputColumnId ? 1 : 0;
  resultColumns.splice(
    resultColumns.indexOf(inputColumnDefinition) + offset,
    replacingItems,
    outputColumnDefinition
  );

  return resultColumns;
}
