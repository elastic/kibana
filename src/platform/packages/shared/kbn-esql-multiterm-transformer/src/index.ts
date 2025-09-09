/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DatatableColumn, DatatableRow } from '@kbn/expressions-plugin/common';

interface EsqlMultiTermTransformInput {
  columns: DatatableColumn[];
  rows: DatatableRow[];
}

interface EsqlMultiTermTransformOutput {
  columns: DatatableColumn[];
  rows: DatatableRow[];
}

/**
 * Checks a datatable for a specific shape (1 date, 1 number, and 2 or more string columns)
 * and transforms it if the shape is matched. The transformation combines the string
 * columns into a single column, creating a unified breakdown dimension for visualizations.
 *
 * @param {EsqlMultiTermTransformInput} input - The datatable containing columns and rows.
 * @returns {EsqlMultiTermTransformOutput} The transformed datatable, or the original if the shape is not matched.
 */
export function transformEsqlMultiTermBreakdown({
  columns,
  rows,
}: EsqlMultiTermTransformInput): EsqlMultiTermTransformOutput {
  if (columns.length <= 2) {
    return { columns, rows };
  }

  const dateColumns = columns.filter((c) => c.meta.type === 'date');
  const numberColumns = columns.filter((c) => c.meta.type === 'number');
  const stringColumns = columns.filter((c) => c.meta.type === 'string');

  if (dateColumns.length === 1 && numberColumns.length === 1 && stringColumns.length >= 2) {
    const newColumnName = stringColumns.map((c) => c.name).join(' > ');
    const stringColumnIds = stringColumns.map((c) => c.id);

    const newRows = rows.map((row) => {
      const newRow = { ...row };
      newRow[newColumnName] = stringColumnIds.map((id) => row[id] ?? '(empty)').join(' > ');
      stringColumnIds.forEach((id) => {
        delete newRow[id];
      });
      return newRow;
    });

    const newColumns = [
      ...dateColumns,
      ...numberColumns,
      {
        id: newColumnName,
        name: newColumnName,
        meta: { type: 'string' as const, esqlType: 'keyword' },
      },
    ];

    return { columns: newColumns, rows: newRows };
  }

  return { columns, rows };
}
