/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isObject } from 'lodash';

// @ts-ignore
import { saveAs } from '@elastic/filesaver';

import { DataViewColumn, DataViewRow } from '../types';

const LINE_FEED_CHARACTER = '\r\n';
const nonAlphaNumRE = /[^a-zA-Z0-9]/;
const allDoubleQuoteRE = /"/g;

function escape(val: string, quoteValues: boolean) {
  if (isObject(val)) {
    val = (val as any).valueOf();
  }

  val = String(val);

  if (quoteValues && nonAlphaNumRE.test(val)) {
    val = `"${val.replace(allDoubleQuoteRE, '""')}"`;
  }

  return val;
}

function buildCsv(
  columns: DataViewColumn[],
  rows: DataViewRow[],
  csvSeparator: string,
  quoteValues: boolean,
  valueFormatter?: Function
) {
  // Build the header row by its names
  const header = columns.map((col) => escape(col.name, quoteValues));

  // Convert the array of row objects to an array of row arrays
  const orderedFieldNames = columns.map((col) => col.field);
  const csvRows = rows.map((row) => {
    return orderedFieldNames.map((field) =>
      escape(valueFormatter ? valueFormatter(row[field]) : row[field], quoteValues)
    );
  });

  return (
    [header, ...csvRows].map((row) => row.join(csvSeparator)).join(LINE_FEED_CHARACTER) +
    LINE_FEED_CHARACTER
  ); // Add \r\n after last line
}

export function exportAsCsv({
  filename,
  columns,
  rows,
  valueFormatter,
  csvSeparator,
  quoteValues,
}: any) {
  const type = 'text/plain;charset=utf-8';

  const csv = new Blob([buildCsv(columns, rows, csvSeparator, quoteValues, valueFormatter)], {
    type,
  });
  saveAs(csv, filename);
}
