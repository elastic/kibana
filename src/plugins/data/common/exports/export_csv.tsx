/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
}

export function datatableToCSV(
  { columns, rows }: Datatable,
  { csvSeparator, quoteValues, formatFactory, raw, escapeFormulaValues }: CSVOptions
) {
  const escapeValues = createEscapeValue({
    separator: csvSeparator,
    quoteValues,
    escapeFormulaValues,
  });

  const header: string[] = [];
  const sortedColumnIds: string[] = [];
  const formatters: Record<string, ReturnType<FormatFactory>> = {};

  columns.forEach((column, i) => {
    header[i] = escapeValues(column.name);
    sortedColumnIds[i] = column.id;
    formatters[column.id] = formatFactory(column.meta?.params);
  });

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
    LINE_FEED_CHARACTER // Add \r\n after last line
  );
}
