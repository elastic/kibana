/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DatatableColumn, DatatableRow } from '@kbn/expressions-plugin/common';
import { Parser, Walker } from '@kbn/esql-ast';

interface EsqlMultiTermTransformInput {
  columns: DatatableColumn[];
  rows: DatatableRow[];
  query?: string;
}

interface EsqlMultiTermTransformOutput {
  columns: DatatableColumn[];
  rows: DatatableRow[];
  transformed: boolean;
  newColumnName: string | null;
  originalStringColumns: DatatableColumn[];
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
  query,
}: EsqlMultiTermTransformInput): EsqlMultiTermTransformOutput {
  const noTransform = {
    columns,
    rows,
    transformed: false,
    newColumnName: null,
    originalStringColumns: [],
  };

  // No query, don't transform
  if (!query) {
    return noTransform;
  }

  // If the query is a string BUT it does not have a STATS command, don't transform
  if (typeof query === 'string') {
    const { root } = Parser.parse(query);
    const statsCommand = Walker.find(
      root,
      (node) => node.type === 'command' && node.name === 'stats'
    );
    if (!statsCommand) {
      return noTransform;
    }
  }

  // If the columns are less than 2, dont transform
  if (columns.length <= 2) {
    return noTransform;
  }

  // Categorize columns by their data type.
  const dateColumns = columns.filter((c) => c.meta.type === 'date');
  const numberColumns = columns.filter((c) => c.meta.type === 'number');
  const stringColumns = columns.filter((c) => c.meta.type === 'string');

  // Check if the datatable matches the specific shape for transformation.
  if (dateColumns.length === 1 && numberColumns.length === 1 && stringColumns.length >= 2) {
    // Create the new combined column name (e.g., "host.name > region").
    const newColumnName = stringColumns.map((c) => c.name).join(', ');
    const stringColumnIds = stringColumns.map((c) => c.id);

    // Transform each row to have the new combined column.
    const newRows = rows.map((row) => {
      const newRow = { ...row };
      // Concatenate the values of the original string columns.
      newRow[newColumnName] = stringColumnIds.map((id) => row[id] ?? '(empty)').join(', ');
      // Remove the original string columns from the row.
      stringColumnIds.forEach((id) => {
        delete newRow[id];
      });
      return newRow;
    });

    // Create the new set of columns for the transformed table.
    const newColumns = [
      ...dateColumns,
      ...numberColumns,
      {
        id: newColumnName,
        name: newColumnName,
        meta: { type: 'string' as const, esqlType: 'keyword' },
      },
    ];

    return {
      columns: newColumns,
      rows: newRows,
      transformed: true,
      newColumnName,
      originalStringColumns: stringColumns,
    };
  }

  return noTransform;
}
