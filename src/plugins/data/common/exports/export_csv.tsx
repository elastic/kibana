/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// Inspired by the inspector CSV exporter

import { Datatable } from '@kbn/expressions-plugin';
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
}

export function datatableToCSV(
  { columns, rows }: Datatable,
  { csvSeparator, quoteValues, formatFactory, raw, escapeFormulaValues }: CSVOptions
) {
  const escapeValues = createEscapeValue(quoteValues, escapeFormulaValues);
  // Build the header row by its names
  const header = columns.map((col) => escapeValues(col.name));

  const formatters = columns.reduce<Record<string, ReturnType<FormatFactory>>>(
    (memo, { id, meta }) => {
      memo[id] = formatFactory(meta?.params);
      return memo;
    },
    {}
  );

  // Convert the array of row objects to an array of row arrays
  const csvRows = rows.map((row) => {
    return columns.map((column) =>
      escapeValues(raw ? row[column.id] : formatters[column.id].convert(row[column.id]))
    );
  });

  if (header.length === 0) {
    return '';
  }

  return (
    [header, ...csvRows].map((row) => row.join(csvSeparator)).join(LINE_FEED_CHARACTER) +
    LINE_FEED_CHARACTER
  ); // Add \r\n after last line
}
