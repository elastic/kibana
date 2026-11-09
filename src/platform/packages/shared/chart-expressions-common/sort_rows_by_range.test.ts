/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { sortRowsByRangeLowerBound } from './sort_rows_by_range';

describe('sortRowsByRangeLowerBound', () => {
  const rows = [{ bucket: '50.0..100.0' }, { bucket: '0.0..50.0' }, { bucket: '100.0..150.0' }];
  const column = {
    id: 'bucket',
    name: 'bucket',
    meta: { type: 'number_range' },
  } as DatatableColumn;

  it('should sort by the range lower bound in descending order', () => {
    expect(sortRowsByRangeLowerBound(rows, column, 'desc')).toEqual([
      { bucket: '100.0..150.0' },
      { bucket: '50.0..100.0' },
      { bucket: '0.0..50.0' },
    ]);
  });

  it('should sort by the range lower bound in ascending order', () => {
    expect(sortRowsByRangeLowerBound(rows, column, 'asc')).toEqual([
      { bucket: '0.0..50.0' },
      { bucket: '50.0..100.0' },
      { bucket: '100.0..150.0' },
    ]);
  });

  it('should keep the rows as they are without a sort predicate', () => {
    expect(sortRowsByRangeLowerBound(rows, column)).toEqual(rows);
  });
});
