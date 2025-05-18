/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AccessorFn } from '@elastic/charts';
import type { DatatableColumn, Datatable } from '@kbn/expressions-plugin/public';
import type { FormatFactory } from '@kbn/field-formats-plugin/common';
import type { ExpressionValueVisDimension } from '@kbn/visualizations-plugin/common';
import { getColumnByAccessor } from '@kbn/visualizations-plugin/common/utils';

export const getSplitDimensionAccessor = (
  columns: DatatableColumn[],
  splitDimension: ExpressionValueVisDimension | string,
  formatFactory: FormatFactory
): AccessorFn => {
  const splitChartColumn = getColumnByAccessor(splitDimension, columns)!;
  const accessor = splitChartColumn.id;

  const formatter = formatFactory(splitChartColumn.meta?.params);
  const fn: AccessorFn = (d) => {
    const v = d[accessor];
    if (v === undefined) {
      return;
    }

    const f = formatter.convert(v);
    return f;
  };

  return fn;
};

export function createSplitPoint(
  splitDimension: ExpressionValueVisDimension | string,
  value: string | number,
  formatFactory: FormatFactory,
  table: Datatable
) {
  const splitChartColumn = getColumnByAccessor(splitDimension, table.columns)!;
  const accessor = splitChartColumn.id;

  const formatter = formatFactory(splitChartColumn.meta?.params);
  const splitPointRowIndex = table.rows.findIndex((row) => {
    return formatter.convert(row[accessor]) === value;
  });
  if (splitPointRowIndex !== -1) {
    return {
      row: splitPointRowIndex,
      column: table.columns.findIndex((column) => column.id === accessor),
      value: table.rows[splitPointRowIndex][accessor],
      table,
    };
  }
}
