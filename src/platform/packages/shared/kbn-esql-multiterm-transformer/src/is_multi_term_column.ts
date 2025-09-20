/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { DatatableColumnMetaWithOriginalStringColumns } from './types';

/**
 * Type guard to check if a datatable column has been transformed to combine multiple string columns.
 * This is identified by the presence of `originalStringColumns` and `originalValueLookup` in the column's meta property.
 *
 * @param {DatatableColumn} column - The datatable column to check.
 * @returns {boolean} - True if the column has original string columns, false otherwise.
 */
export function isMultiTermColumn(
  column: DatatableColumn
): column is DatatableColumn & { meta: DatatableColumnMetaWithOriginalStringColumns } {
  return (
    column.meta !== undefined &&
    'originalStringColumns' in column.meta &&
    Array.isArray((column.meta as any).originalStringColumns) &&
    'originalValueLookup' in column.meta &&
    (column.meta as any).originalValueLookup instanceof Map
  );
}
