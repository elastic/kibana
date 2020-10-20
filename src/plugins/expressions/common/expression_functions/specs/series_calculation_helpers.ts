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
import { Datatable, DatatableRow } from '../../expression_types';

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
 */
export function buildResultColumns(
  input: Datatable,
  outputColumnId: string,
  inputColumnId: string,
  outputColumnName: string | undefined
) {
  if (input.columns.some((column) => column.id === outputColumnId)) {
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
  // add output column after input column in the table
  resultColumns.splice(resultColumns.indexOf(inputColumnDefinition) + 1, 0, outputColumnDefinition);
  return resultColumns;
}
