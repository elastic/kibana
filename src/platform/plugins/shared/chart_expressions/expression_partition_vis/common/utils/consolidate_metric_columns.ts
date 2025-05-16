/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Datatable, DatatableColumn, DatatableRow } from '@kbn/expressions-plugin/common';
import { getColumnByAccessor } from '@kbn/visualizations-plugin/common/utils';
import type { ExpressionValueVisDimension } from '@kbn/visualizations-plugin/common';

function nonNullable<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined;
}

export const consolidateMetricColumns = (
  table: Datatable,
  bucketAccessors: Array<string | ExpressionValueVisDimension> = [],
  metricAccessors: Array<string | ExpressionValueVisDimension>,
  metricsToLabels: Record<string, string>
): {
  table: Datatable;
  metricAccessor: string | ExpressionValueVisDimension | undefined;
  bucketAccessors: Array<string | ExpressionValueVisDimension>;
} => {
  if (metricAccessors.length < 2) {
    return {
      table,
      metricAccessor: metricAccessors[0],
      bucketAccessors,
    };
  }

  const bucketColumns = bucketAccessors
    ?.map((accessor) => getColumnByAccessor(accessor, table.columns))
    .filter(nonNullable);

  const metricColumns = metricAccessors
    ?.map((accessor) => getColumnByAccessor(accessor, table.columns))
    .filter(nonNullable);

  const transposedRows: DatatableRow[] = [];

  const nameColumnId = 'metric-name';
  const valueColumnId = 'value';

  table.rows.forEach((row) => {
    metricColumns.forEach((metricCol) => {
      const newRow: DatatableRow = {};

      bucketColumns.forEach(({ id }) => {
        newRow[id] = row[id];
      });

      newRow[nameColumnId] = metricsToLabels[metricCol.id];
      newRow[valueColumnId] = row[metricCol.id];

      transposedRows.push(newRow);
    });
  });

  const transposedColumns: DatatableColumn[] = [
    ...bucketColumns,
    {
      id: nameColumnId,
      name: nameColumnId,
      meta: {
        type: 'string',
        sourceParams: {
          consolidatedMetricsColumn: true,
        },
      },
    },
    {
      id: valueColumnId,
      name: valueColumnId,
      meta: {
        type: 'number',
      },
    },
  ];

  return {
    metricAccessor: valueColumnId,
    bucketAccessors: [...bucketColumns.map(({ id }) => id), nameColumnId],
    table: {
      type: 'datatable',
      columns: transposedColumns,
      rows: transposedRows,
    },
  };
};
