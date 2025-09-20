/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DatatableColumn, DatatableRow } from '@kbn/expressions-plugin/common';
import { isMultiTermColumn } from './is_multi_term_column';

/**
 * Restores a datatable that has been transformed by `transformEsqlMultiTermBreakdown` to its original state.
 * This function checks for a multi-term column and, if found, restores the original string columns and their values.
 * If no multi-term column is present, the original datatable is returned unchanged.
 *
 * @param {EsqlMultiTermTransformOutput} datatable - The datatable to restore, which may or may not have been transformed.
 * @returns {Datatable} The restored datatable, or the original if no transformation was needed.
 */
export function restoreOriginalDatatable(datatable: {
  columns: DatatableColumn[];
  rows: DatatableRow[];
}) {
  const multiTermColumn = datatable.columns.find(isMultiTermColumn);

  if (!multiTermColumn) {
    return datatable;
  }

  const { originalStringColumns, originalValueLookup } = multiTermColumn.meta;

  // Restore the original columns
  const restoredColumns = datatable.columns.flatMap((column) =>
    isMultiTermColumn(column) ? originalStringColumns : [column]
  );

  // Restore the original rows
  const restoredRows = datatable.rows.map((row) => {
    const newRow = { ...row };
    const combinedValue = newRow[multiTermColumn.id];

    if (typeof combinedValue === 'string' && originalValueLookup.has(combinedValue)) {
      const originalValues = originalValueLookup.get(combinedValue);
      Object.assign(newRow, originalValues);
    }

    delete newRow[multiTermColumn.id];
    return newRow;
  });

  return {
    columns: restoredColumns,
    rows: restoredRows,
  };
}
