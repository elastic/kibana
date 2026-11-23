/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { isFilterableColumnSet } from './computed_column_warning';

function buildColumn(overrides: Partial<DatatableColumn> = {}): DatatableColumn {
  return {
    id: 'col-1',
    name: 'speed_category',
    meta: { type: 'string' },
    ...overrides,
  };
}

describe('isFilterableColumnSet', () => {
  it('is true for an EVAL-computed column, as it is filtered with an ES|QL filter', () => {
    const column = buildColumn({
      isComputedColumn: true,
      meta: { type: 'string', sourceParams: { sourceField: 'speed_category' } },
    });

    expect(isFilterableColumnSet([column])).toBe(true);
  });

  it('is true for an EVAL-computed column with a custom label', () => {
    const column = buildColumn({
      name: 'My Custom Label',
      isComputedColumn: true,
      meta: { type: 'string', sourceParams: { sourceField: 'speed_category' } },
    });

    expect(isFilterableColumnSet([column])).toBe(true);
  });

  it('is true for a RENAMED column, even with a custom label', () => {
    const column = buildColumn({
      name: 'My Custom Label',
      isComputedColumn: true,
      meta: {
        type: 'string',
        sourceParams: { sourceField: 'real_field', isSourceFieldFilterable: true },
      },
    });

    expect(isFilterableColumnSet([column])).toBe(true);
  });

  it('is true for non-computed columns and when there are no columns', () => {
    expect(isFilterableColumnSet([buildColumn()])).toBe(true);
    expect(isFilterableColumnSet([undefined])).toBe(true);
    expect(isFilterableColumnSet([])).toBe(true);
  });

  it('is false for a computed date column, as the time range is what changes for it', () => {
    const column = buildColumn({
      name: 'bucket',
      isComputedColumn: true,
      meta: { type: 'date', sourceParams: { sourceField: 'bucket' } },
    });

    expect(isFilterableColumnSet([column])).toBe(false);
  });

  it('is false if any column in the set is a computed date column', () => {
    const date = buildColumn({
      id: 'col-2',
      isComputedColumn: true,
      meta: { type: 'date', sourceParams: { sourceField: 'bucket' } },
    });

    expect(isFilterableColumnSet([buildColumn(), date])).toBe(false);
  });

  it('is true for a date column that is a RENAMED one', () => {
    const column = buildColumn({
      isComputedColumn: true,
      meta: {
        type: 'date',
        sourceParams: { sourceField: '@timestamp', isSourceFieldFilterable: true },
      },
    });

    expect(isFilterableColumnSet([column])).toBe(true);
  });
});
