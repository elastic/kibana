/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  DatatableColumn,
  DatatableRow,
  DatatableColumnMeta,
} from '@kbn/expressions-plugin/common';
import { Parser, Walker } from '@kbn/esql-ast';
import type { FieldFormatsContentType } from '@kbn/field-formats-plugin/common';
import { i18n } from '@kbn/i18n';

interface MultiTermFormatter {
  convert: (value: any, contentType?: FieldFormatsContentType) => string;
}

interface EsqlMultiTermTransformInput {
  columns: DatatableColumn[];
  rows: DatatableRow[];
  query?: string;
  formatter?: MultiTermFormatter;
}

interface EsqlMultiTermTransformOutput {
  columns: DatatableColumn[];
  rows: DatatableRow[];
  transformed: boolean;
  newColumnName: string | null;
  originalStringColumns: DatatableColumn[];
}

interface DatatableColumnMetaWithOriginalStringColumns extends DatatableColumnMeta {
  originalStringColumns: DatatableColumn[];
  originalValueLookup: Map<string, Record<string, unknown>>;
}

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

/**
 * Generates the parameters required for the `multi_terms` field formatter.
 * This is used to format the combined string columns created by `transformEsqlMultiTermBreakdown`.
 *
 * @param {DatatableColumn[]} columns - The columns of the datatable.
 * @returns {object} The parameters for the `multi_terms` field formatter.
 */
export function getMultiTermsFormatterParams(columns: DatatableColumn[]) {
  return {
    paramsPerField: columns
      .filter((c) => c.meta.type === 'string')
      .map((c) => ({
        id: 'terms',
        params: {
          id: 'string',
          missingBucketLabel: i18n.translate('esqlMultiTermTransformer.missingLabel', {
            defaultMessage: '(empty)',
          }),
        },
      })),
  };
}

/**
 * Checks a datatable for a specific shape (1 date, 1 number, and 2 or more string columns)
 * and transforms it if the shape is matched and the ESQL query uses both `TS` and `STATS` commands.
 * The transformation combines the string columns into a single column, creating a unified
 * breakdown dimension for visualizations.
 *
 * @param {EsqlMultiTermTransformInput} input - The datatable containing columns and rows.
 * @returns {EsqlMultiTermTransformOutput} The transformed datatable, or the original if the shape is not matched.
 */
export function transformEsqlMultiTermBreakdown({
  columns,
  rows,
  query,
  formatter,
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
    const tsCommand = Walker.find(root, (node) => node.type === 'command' && node.name === 'ts');
    if (!statsCommand || !tsCommand) {
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
    // Create the new combined column name (e.g., "host.name › region").
    const newColumnName = stringColumns.map((c) => c.name).join(' › ');
    const stringColumnIds = stringColumns.map((c) => c.id);

    const originalValueLookup = new Map<string, Record<string, unknown>>();
    // Transform each row to have the new combined column.
    const newRows = rows.map((row) => {
      const newRow = { ...row };
      // Concatenate the values of the original string columns.
      const values = stringColumnIds.map((id) => row[id] ?? '__missing__');
      const combinedValue = formatter
        ? formatter.convert({ keys: values }, 'text')
        : values.join(' › ');
      newRow[newColumnName] = combinedValue;

      const originalValues = stringColumnIds.reduce((acc, id) => {
        acc[id] = row[id];
        return acc;
      }, {} as Record<string, unknown>);
      originalValueLookup.set(combinedValue, originalValues);

      return newRow;
    });

    // Create the new set of columns for the transformed table.
    const newColumns = [
      ...dateColumns,
      ...numberColumns,
      {
        id: newColumnName,
        name: newColumnName,
        meta: {
          type: 'string' as const,
          esqlType: 'keyword',
          originalStringColumns: stringColumns,
          originalValueLookup,
        },
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
