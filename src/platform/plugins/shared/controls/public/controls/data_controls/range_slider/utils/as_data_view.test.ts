/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FilterableSource } from '@kbn/data-source';
import { asDataView } from './as_data_view';

describe('asDataView', () => {
  const source = (overrides: Partial<FilterableSource> = {}): FilterableSource => ({
    id: 'source-id',
    title: 'logs-*',
    fields: [],
    isTimeBased: () => false,
    ...overrides,
  });

  it('does not take the source of an ES|QL dataset for a data view', () => {
    expect(asDataView(source({ kind: 'esql' }))).toBeUndefined();
  });

  it('is the source when it is a data view, which has no kind', () => {
    const dataView = source();

    expect(asDataView(dataView)).toBe(dataView);
    expect(asDataView(undefined)).toBeUndefined();
  });
});
