/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExpressionValueVisDimension } from '../../../../../visualizations/public';

export const getValueByAccessor = <T extends Record<string, any>>(
  data: T,
  accessor: ExpressionValueVisDimension['accessor'] | string
) => {
  if (typeof accessor === 'number') {
    return Object.values(data)[accessor];
  }

  return typeof accessor === 'string' ? data[accessor] : data[accessor.id];
};

export const getColumnByAccessor = <T extends { id: string | number }>(
  columns: T[],
  accessor: ExpressionValueVisDimension['accessor']
) => {
  if (typeof accessor === 'number') {
    return columns[accessor];
  }

  return columns.filter((col) => col.id === accessor.id)[0];
};
