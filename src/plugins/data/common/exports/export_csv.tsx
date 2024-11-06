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
import { createEscapeValue } from './escape_value';

export const LINE_FEED_CHARACTER = '\r\n';
export const CSV_MIME_TYPE = 'text/plain;charset=utf-8';

interface CSVOptions {
  csvSeparator: string;
  quoteValues: boolean;
  escapeFormulaValues: boolean;
  formatFactory: FormatFactory;
  raw?: boolean;
  columnsSorting?: string[];
}

export function datatableToCSV(
  { columns, rows }: Datatable,
  { csvSeparator, quoteValues, formatFactory, raw, escapeFormulaValues, columnsSorting }: CSVOptions
) {
  const escapeValues = createEscapeValue({
    separator: csvSeparator,
    quoteValues,
    escapeFormulaValues,
  });

  const sortedIds = columnsSorting || columns.map((col) => col.id);

  // Build an index lookup table
  const columnIndexLookup = sortedIds.reduce((memo, id, index) => {
    memo[id] = index;
    return memo;
  }, {} as Record<string, number>);

  // Build the header row by its names
  const header: string[] = [];
  const sortedColumnIds: string[] = [];
  const formatters: Record<string, ReturnType<FormatFactory>> = {};

  for (const column of columns) {
    const columnIndex = columnIndexLookup[column.id];

    header[columnIndex] = escapeValues(column.name);
    sortedColumnIds[columnIndex] = column.id;
    formatters[column.id] = formatFactory(column.meta?.params);
  }

  if (header.length === 0) {
    return '';
  }

  // Convert the array of row objects to an array of row arrays
  const csvRows = rows.map((row) => {
    return sortedColumnIds.map((id) =>
      escapeValues(raw ? row[id] : formatters[id].convert(row[id]))
    );
  });

  return (
    [header, ...csvRows].map((row) => row.join(csvSeparator)).join(LINE_FEED_CHARACTER) +
    LINE_FEED_CHARACTER
  ); // Add \r\n after last line
}
