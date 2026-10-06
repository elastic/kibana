/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Datatable } from '@kbn/expressions-plugin/common';
import type { FormatFactory } from '@kbn/field-formats-plugin/common';
export declare const LINE_FEED_CHARACTER = '\r\n';
export declare const CSV_MIME_TYPE = 'text/plain;charset=utf-8';
interface CSVOptions {
  csvSeparator: string;
  quoteValues: boolean;
  escapeFormulaValues: boolean;
  formatFactory: FormatFactory;
  raw?: boolean;
  /**
   * Mirrors `TablesAdapter.missingValueDisplay`: only `'table'` exports missing values as the
   * dash the table renders; otherwise they go through the formatter and keep the `(null)` label.
   */
  missingValueDisplay?: 'text' | 'table';
}
export declare function datatableToCSV(
  { columns, rows }: Datatable,
  {
    csvSeparator,
    quoteValues,
    formatFactory,
    raw,
    escapeFormulaValues,
    missingValueDisplay,
  }: CSVOptions
): string;
export {};
