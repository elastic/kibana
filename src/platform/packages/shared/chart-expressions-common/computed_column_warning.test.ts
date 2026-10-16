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

  describe('blank ES|QL text field values', () => {
    const textColumn = buildColumn({ meta: { type: 'string', esType: 'text' } });
    const keywordColumn = buildColumn({ meta: { type: 'string', esType: 'keyword' } });

    it('is true for a text column with a null value', () => {
      expect(isFilterableColumnSet([textColumn], [null])).toBe(true);
    });

    it('is false for a text column with an empty string value', () => {
      expect(isFilterableColumnSet([textColumn], [''])).toBe(false);
    });

    it('is true for a text column with a non-blank value', () => {
      expect(isFilterableColumnSet([textColumn], ['hello'])).toBe(true);
    });

    it('is true for a keyword column with a blank value', () => {
      expect(isFilterableColumnSet([keywordColumn], [null])).toBe(true);
    });

    it('is true when no values are provided, even for a text column', () => {
      expect(isFilterableColumnSet([textColumn])).toBe(true);
    });
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

  describe('blank ES|QL text field values', () => {
    const textColumn = buildColumn({ meta: { type: 'string', esType: 'text' } });
    const keywordColumn = buildColumn({ meta: { type: 'string', esType: 'keyword' } });

    it('returns undefined for a text column with a null value', () => {
      expect(getFilterDrilldownWarningMessage([textColumn], [null])).toBeUndefined();
    });

    it('returns the blank text field message for a text column with an empty string value', () => {
      const message = getFilterDrilldownWarningMessage([textColumn], ['']);
      expect(message).toContain('keyword field');
    });

    it('returns undefined for a text column with a non-blank value', () => {
      expect(getFilterDrilldownWarningMessage([textColumn], ['hello'])).toBeUndefined();
    });

    it('returns undefined for a keyword column with a blank value', () => {
      expect(getFilterDrilldownWarningMessage([keywordColumn], [null])).toBeUndefined();
    });

    it('returns undefined when no values are provided, even for a text column', () => {
      expect(getFilterDrilldownWarningMessage([textColumn])).toBeUndefined();
    });
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
