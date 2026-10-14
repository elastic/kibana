/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { isFilterableColumnSet, getFilterDrilldownWarningMessage } from './computed_column_warning';

function buildColumn(overrides: Partial<DatatableColumn> = {}): DatatableColumn {
  return {
    id: 'col-1',
    name: 'speed_category',
    meta: { type: 'string' },
    ...overrides,
  };
}

describe('isFilterableColumnSet', () => {
  it('is false for an EVAL-computed column with no custom label', () => {
    const column = buildColumn({
      isComputedColumn: true,
      meta: {
        type: 'string',
        sourceParams: { sourceField: 'speed_category', isSourceFieldFilterable: false },
      },
    });

    expect(isFilterableColumnSet([column])).toBe(false);
  });

  it('is true for a RENAMED column, even with a custom label', () => {
    const column = buildColumn({
      name: 'My Renamed Label',
      isComputedColumn: true,
      meta: {
        type: 'string',
        sourceParams: { sourceField: 'old_field', isSourceFieldFilterable: true },
      },
    });

    expect(isFilterableColumnSet([column])).toBe(true);
  });

  it('is true for non-computed columns', () => {
    const column = buildColumn({ isComputedColumn: false });

    expect(isFilterableColumnSet([column])).toBe(true);
  });

  it('is false for a non-filterable computed date column, even though the message is suppressed', () => {
    const column = buildColumn({
      isComputedColumn: true,
      meta: {
        type: 'date',
        sourceParams: { sourceField: 'bucket_date', isSourceFieldFilterable: false },
      },
    });

    expect(isFilterableColumnSet([column])).toBe(false);
  });

  it('is false if any column in the set is non-filterable', () => {
    const filterableColumn = buildColumn({ isComputedColumn: false });
    const nonFilterableColumn = buildColumn({
      id: 'col-2',
      isComputedColumn: true,
      meta: {
        type: 'string',
        sourceParams: { sourceField: 'speed_category', isSourceFieldFilterable: false },
      },
    });

    expect(isFilterableColumnSet([filterableColumn, nonFilterableColumn])).toBe(false);
  });
});

describe('getFilterDrilldownWarningMessage', () => {
  it('warns for an EVAL-computed column with no custom label', () => {
    const column = buildColumn({
      isComputedColumn: true,
      meta: {
        type: 'string',
        sourceParams: { sourceField: 'speed_category', isSourceFieldFilterable: false },
      },
    });

    expect(getFilterDrilldownWarningMessage([column])).toBeDefined();
  });

  it('still warns after the dimension is given a custom label', () => {
    // Simulates renaming the dimension via the Appearance section: column.name becomes the
    // custom label, but sourceParams (computed once from the ES|QL query, before any label is
    // applied) is untouched — there was never a real RENAME, so isSourceFieldFilterable is false.
    const column = buildColumn({
      name: 'My Renamed Label',
      isComputedColumn: true,
      meta: {
        type: 'string',
        sourceParams: { sourceField: 'speed_category', isSourceFieldFilterable: false },
      },
    });

    expect(getFilterDrilldownWarningMessage([column])).toBeDefined();
  });

  it('does not warn for a RENAMED column, even with a custom label', () => {
    // RENAME old_field AS speed_category — isSourceFieldFilterable is true because sourceField
    // points at the still-addressable underlying field, so filtering remains possible
    // regardless of any custom label.
    const column = buildColumn({
      name: 'My Renamed Label',
      isComputedColumn: true,
      meta: {
        type: 'string',
        sourceParams: { sourceField: 'old_field', isSourceFieldFilterable: true },
      },
    });

    expect(getFilterDrilldownWarningMessage([column])).toBeUndefined();
  });

  it('does not warn for non-computed columns', () => {
    const column = buildColumn({ isComputedColumn: false });

    expect(getFilterDrilldownWarningMessage([column])).toBeUndefined();
  });

  it('suppresses the message for a non-filterable computed date column', () => {
    const column = buildColumn({
      isComputedColumn: true,
      meta: {
        type: 'date',
        sourceParams: { sourceField: 'bucket_date', isSourceFieldFilterable: false },
      },
    });

    expect(getFilterDrilldownWarningMessage([column])).toBeUndefined();
  });

  it('still warns about a non-date column when mixed with a suppressed non-filterable date column', () => {
    const dateColumn = buildColumn({
      id: 'col-date',
      name: 'bucket_date',
      isComputedColumn: true,
      meta: {
        type: 'date',
        sourceParams: { sourceField: 'bucket_date', isSourceFieldFilterable: false },
      },
    });
    const stringColumn = buildColumn({
      id: 'col-string',
      name: 'speed_category',
      isComputedColumn: true,
      meta: {
        type: 'string',
        sourceParams: { sourceField: 'speed_category', isSourceFieldFilterable: false },
      },
    });

    const message = getFilterDrilldownWarningMessage([dateColumn, stringColumn]);
    expect(message).toContain('speed_category');
  });
});
