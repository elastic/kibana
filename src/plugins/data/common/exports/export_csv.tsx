/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Inspired by the inspector CSV exporter

import { Datatable } from '@kbn/expressions-plugin/common';
import { FormatFactory } from '@kbn/field-formats-plugin/common';
import { EuiDataGridColumnSortingConfig } from '@elastic/eui';
import { createEscapeValue } from './escape_value';

export const LINE_FEED_CHARACTER = '\r\n';
export const CSV_MIME_TYPE = 'text/plain;charset=utf-8';

interface CSVOptions {
  csvSeparator: string;
  quoteValues: boolean;
  escapeFormulaValues: boolean;
  formatFactory: FormatFactory;
  raw?: boolean;
  sortedColumns?: string[];
  columnSorting?: EuiDataGridColumnSortingConfig[];
}

export function datatableToCSV(
  { columns, rows }: Datatable,
  {
    csvSeparator,
    quoteValues,
    formatFactory,
    raw,
    escapeFormulaValues,
    sortedColumns,
    columnSorting,
  }: CSVOptions
) {
  const escapeValues = createEscapeValue({
    separator: csvSeparator,
    quoteValues,
    escapeFormulaValues,
  });

  const sortedIds = sortedColumns
    ? columns
        .map((c) => {
          // need to find original id for transposed column
          const sortIndex = sortedColumns.findIndex((id) => c.id.endsWith(id));
          return {
            id: c.id,
            sortIndex,
            isTransposed: (sortedColumns[sortIndex] ?? '') !== c.id,
          };
        })
        .filter(({ sortIndex }) => sortIndex >= 0)
        // keep original zipped order between multiple transposed columns
        .sort((a, b) => (a.isTransposed && b.isTransposed ? 0 : a.sortIndex - b.sortIndex))
        .map(({ id }) => id)
    : columns.map(({ id }) => id);

  const columnIndexLookup = new Map(sortedIds.map((id, i) => [id, i]));

  const header: string[] = [];
  const sortedColumnIds: string[] = [];
  const formatters: Record<string, ReturnType<FormatFactory>> = {};

  for (const column of columns) {
    const columnIndex = columnIndexLookup.get(column.id) ?? -1;
    if (columnIndex < 0) continue; // hidden or not found

    header[columnIndex] = escapeValues(column.name);
    sortedColumnIds[columnIndex] = column.id;
    formatters[column.id] = formatFactory(column.meta?.params);
  }

  if (header.length === 0) {
    return '';
  }

  // Convert the array of row objects to an array of row arrays
  const csvRows = rows
    .map((row) => {
      return sortedColumnIds.map((id) =>
        escapeValues(raw ? row[id] : formatters[id].convert(row[id]))
      );
    })
    .sort(rowSortPredicate(sortedColumnIds, columnSorting));

  return (
    [header, ...csvRows].map((row) => row.join(csvSeparator)).join(LINE_FEED_CHARACTER) +
    LINE_FEED_CHARACTER
  ); // Add \r\n after last line
}

function rowSortPredicate(
  sortedColumnIds: string[],
  columnSorting?: EuiDataGridColumnSortingConfig[]
) {
  if (!columnSorting) return () => 0;

  const columnIdMap = new Map(columnSorting.map(({ id }) => [id, sortedColumnIds.indexOf(id)]));
  return (rowA: string[], rowB: string[]) => {
    return columnSorting.reduce((acc, { id, direction }) => {
      const i = columnIdMap.get(id) ?? -1;
      if (i < 0) return acc;

      const a = rowA[i];
      const b = rowB[i];
      const emptyValueSort = a === '' ? 1 : b === '' ? -1 : 0; // always put empty values at bottom
      return acc || emptyValueSort || a.localeCompare(b) * (direction === 'asc' ? 1 : -1);
    }, 0);
  };
}
