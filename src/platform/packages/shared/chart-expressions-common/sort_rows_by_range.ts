/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DatatableColumn, DatatableRow } from '@kbn/expressions-plugin/common';

// ES|QL returns number ranges (e.g. double_range) as "500.0..550.0"
const getLowerBound = (value: unknown) => Number(String(value).split('..')[0]);

/**
 * Sorts rows by the lower bound of a number range column.
 * Charts show ordinal values in row order and can't sort ranges themselves.
 * Rows are returned as they are for other columns or without a direction.
 */
export const sortRowsByRangeLowerBound = (
  rows: DatatableRow[],
  column?: DatatableColumn,
  direction?: 'asc' | 'desc'
) => {
  if (column?.meta.type !== 'number_range' || !direction) {
    return rows;
  }
  return rows.toSorted((a, b) => {
    const aBound = getLowerBound(a[column.id]);
    const bBound = getLowerBound(b[column.id]);
    return direction === 'asc' ? aBound - bBound : bBound - aBound;
  });
};
