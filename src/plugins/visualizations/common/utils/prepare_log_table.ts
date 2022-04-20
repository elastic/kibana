/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Datatable, DatatableColumn } from '@kbn/expressions-plugin/common/expression_types/specs';
import { ExpressionValueVisDimension } from '../expression_functions/vis_dimension';
import { ExpressionValueXYDimension } from '../expression_functions/xy_dimension';

type DimensionColumn = ExpressionValueVisDimension | ExpressionValueXYDimension | string;

export type Dimension = [DimensionColumn[] | undefined, string];

const isColumnEqualToAccessor = (
  column: DatatableColumn,
  columnIndex: number,
  accessor:
    | ExpressionValueVisDimension['accessor']
    | ExpressionValueXYDimension['accessor']
    | string
) => {
  if (typeof accessor === 'string') {
    return accessor === column.id;
  }

  if (typeof accessor === 'number') {
    return accessor === columnIndex;
  }

  return accessor.id === column.id;
};

const getAccessorFromDimension = (dimension: DimensionColumn) => {
  if (typeof dimension === 'string') {
    return dimension;
  }

  return dimension.accessor;
};

const getDimensionName = (
  column: DatatableColumn,
  columnIndex: number,
  dimensions: Dimension[]
) => {
  for (const dimension of dimensions) {
    if (
      dimension[0]?.find((d) =>
        isColumnEqualToAccessor(column, columnIndex, getAccessorFromDimension(d))
      )
    ) {
      return dimension[1];
    }
  }
};

export const prepareLogTable = (
  datatable: Datatable,
  dimensions: Dimension[],
  removeUnmappedColumns: boolean = false
) => {
  return {
    ...datatable,
    columns: datatable.columns
      .map((column, columnIndex) => {
        return {
          ...column,
          meta: {
            ...column.meta,
            dimensionName: getDimensionName(column, columnIndex, dimensions),
          },
        };
      })
      .filter((column) => !removeUnmappedColumns || column.meta.dimensionName),
  };
};
