/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import type { DocumentsDisplayMode } from '../types';

export const SOURCE_COLUMN = '_source';

// We store this outside the function as a constant, so we're not creating a new array every time
// the function is returning this. A changing array might cause the data grid to think it got
// new columns, and thus performing worse than using the same array over multiple renders.
const SOURCE_ONLY = [SOURCE_COLUMN];

export const getShowSummaryColumn = (columns: string[]): boolean => columns.includes(SOURCE_COLUMN);

export const isSummaryOnlyColumn = (columns: string[]): boolean =>
  columns.length === 1 && columns[0] === SOURCE_COLUMN;

/**
 * Function to provide fallback when
 * 1) no columns are given
 * 2) Just one column is given, which is the configured timefields
 */
export function getDisplayedColumns(
  stateColumns: string[] = [],
  dataView: DataView,
  documentsDisplayMode: DocumentsDisplayMode = 'table'
) {
  // JSON mode is a single JSON cell; selected fields filter that cell instead of becoming their own
  // columns, so always show just the source column.
  if (documentsDisplayMode === 'json') {
    return SOURCE_ONLY;
  }
  return stateColumns &&
    stateColumns.length > 0 &&
    // check if all columns where removed except the configured timeField (this can't be removed)
    !(stateColumns.length === 1 && isPrependedTimeFieldColumn(stateColumns[0], dataView))
    ? stateColumns
    : SOURCE_ONLY;
}

/**
 * The configured time field column is prepended to the grid only when it matches one of the data view fields,
 * otherwise it's a regular column which can be removed like any other column
 */
function isPrependedTimeFieldColumn(column: string, dataView: DataView) {
  return (
    column === dataView.timeFieldName &&
    (!dataView.fields || Boolean(dataView.getFieldByName(column)))
  );
}

export function getInnerColumns(fields: Record<string, unknown[]>, columnId: string) {
  return Object.fromEntries(
    Object.entries(fields).filter(([key]) => {
      return key.startsWith(`${columnId}.`);
    })
  );
}
