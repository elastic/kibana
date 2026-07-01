/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { getNonFilterableComputedColumnWarning } from './computed_column_warning';

function buildColumn(overrides: Partial<DatatableColumn> = {}): DatatableColumn {
  return {
    id: 'col-1',
    name: 'speed_category',
    meta: { type: 'string' },
    ...overrides,
  } as DatatableColumn;
}

describe('getNonFilterableComputedColumnWarning', () => {
  it('warns for an EVAL-computed column with no custom label', () => {
    const column = buildColumn({
      isComputedColumn: true,
      meta: {
        type: 'string',
        sourceParams: { sourceField: 'speed_category', isSourceFieldFilterable: false },
      },
    });

    expect(getNonFilterableComputedColumnWarning([column])).toBeDefined();
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

    expect(getNonFilterableComputedColumnWarning([column])).toBeDefined();
  });

  it('does not warn for a RENAMEd column, even with a custom label', () => {
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

    expect(getNonFilterableComputedColumnWarning([column])).toBeUndefined();
  });

  it('does not warn for non-computed columns', () => {
    const column = buildColumn({ isComputedColumn: false });

    expect(getNonFilterableComputedColumnWarning([column])).toBeUndefined();
  });
});
