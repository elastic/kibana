/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FilterableField, FilterableSource } from '@kbn/data-source';
import { getEsqlSourceFieldQuery } from './esql_source_queries';

describe('getEsqlSourceFieldQuery', () => {
  const field: FilterableField = { name: 'host.name', type: 'string' };
  const source = (overrides: Partial<FilterableSource> = {}): FilterableSource => ({
    kind: 'esql',
    id: 'dataset-id',
    title: 'logs-*,logs=archive',
    fields: [field],
    getFieldByName: () => field,
    isTimeBased: () => false,
    ...overrides,
  });

  it('groups the values of the field on the FROM target of an ES|QL source', () => {
    expect(getEsqlSourceFieldQuery(source(), field)).toBe(
      'FROM logs-*, "logs=archive"\n| STATS BY `host.name`'
    );
  });

  it('has no query for the source of a data view, or without a field', () => {
    expect(getEsqlSourceFieldQuery(source({ kind: undefined }), field)).toBeUndefined();
    expect(getEsqlSourceFieldQuery(source(), undefined)).toBeUndefined();
  });
});
