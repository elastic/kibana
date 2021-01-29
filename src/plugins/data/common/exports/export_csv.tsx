/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

// Inspired by the inspector CSV exporter

import { FormatFactory } from 'src/plugins/data/common/field_formats/utils';
import { Datatable } from 'src/plugins/expressions';

export const LINE_FEED_CHARACTER = '\r\n';
const nonAlphaNumRE = /[^a-zA-Z0-9]/;
const allDoubleQuoteRE = /"/g;
export const CSV_MIME_TYPE = 'text/plain;charset=utf-8';

// TODO: enhance this later on
function escape(val: object | string, quoteValues: boolean) {
  if (val != null && typeof val === 'object') {
    val = val.valueOf();
  }

  val = String(val);

  if (quoteValues && nonAlphaNumRE.test(val)) {
    val = `"${val.replace(allDoubleQuoteRE, '""')}"`;
  }

  return val;
}

interface CSVOptions {
  csvSeparator: string;
  quoteValues: boolean;
  formatFactory: FormatFactory;
  raw?: boolean;
}

export function datatableToCSV(
  { columns, rows }: Datatable,
  { csvSeparator, quoteValues, formatFactory, raw }: CSVOptions
) {
  // Build the header row by its names
  const header = columns.map((col) => escape(col.name, quoteValues));

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
      escape(raw ? row[column.id] : formatters[column.id].convert(row[column.id]), quoteValues)
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
