/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExpressionValueVisDimension } from '../../../../../../visualizations/public';

const hasNextValue = (index: number, arrLength: number) => index < arrLength - 1;

const getNextValue = <T>(index: number, arr: T[]) =>
  hasNextValue(index, arr.length) ? arr[index + 1] : undefined;

interface BaseColumn {
  id: string | number;
}

export const getNextToAccessorColumn = <T extends BaseColumn>(
  columns: T[],
  accessor: ExpressionValueVisDimension['accessor']
) => {
  if (typeof accessor === 'number') {
    return getNextValue(accessor, columns);
  }
  const colIndex = columns.findIndex((column) => column.id === accessor.id);
  return getNextValue(colIndex, columns);
};

export const getValueByAccessor = <T extends Record<string, any>>(
  data: T,
  accessor: ExpressionValueVisDimension['accessor'] | string
) => {
  if (typeof accessor === 'number') {
    return Object.values(data)[accessor];
  }

  return typeof accessor === 'string' ? data[accessor] : data[accessor.id];
};

export const getColumnByAccessor = <T extends BaseColumn>(
  columns: T[],
  accessor: ExpressionValueVisDimension['accessor'] | null
) => {
  if (typeof accessor === 'number') {
    return columns[accessor];
  }

  return columns.filter((col) => col.id === accessor?.id)[0];
};
