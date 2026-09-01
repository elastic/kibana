/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FieldDescriptor } from '@kbn/data-views-plugin/server';
import { toLeafScalarFieldNames } from './to_leaf_scalar_field_names';

const field = (overrides: Partial<FieldDescriptor> & { name: string }): FieldDescriptor => ({
  aggregatable: true,
  readFromDocValues: true,
  searchable: true,
  type: 'keyword',
  esTypes: ['keyword'],
  ...overrides,
});

describe('toLeafScalarFieldNames', () => {
  it('returns scalar leaf field names', () => {
    const names = toLeafScalarFieldNames([
      field({ name: 'kibana.alert.status', type: 'keyword' }),
      field({ name: 'kibana.alert.start', type: 'date' }),
    ]);

    expect(names).toEqual(['kibana.alert.start', 'kibana.alert.status']);
  });

  it('excludes object and nested container fields', () => {
    const names = toLeafScalarFieldNames([
      field({ name: 'kibana.alert.rule.parameters', type: 'object' }),
      field({ name: 'kibana.alert.rule.threshold', type: 'nested' }),
      field({ name: 'kibana.alert.status', type: 'keyword' }),
    ]);

    expect(names).toEqual(['kibana.alert.status']);
  });

  it('excludes leaves inside nested objects', () => {
    const names = toLeafScalarFieldNames([
      field({
        name: 'kibana.alert.rule.threshold.value',
        type: 'long',
        subType: { nested: { path: 'kibana.alert.rule.threshold' } },
      }),
      field({ name: 'kibana.alert.status', type: 'keyword' }),
    ]);

    expect(names).toEqual(['kibana.alert.status']);
  });

  it('de-duplicates fields by name', () => {
    const names = toLeafScalarFieldNames([
      field({ name: 'host.name', type: 'keyword' }),
      field({ name: 'host.name', type: 'keyword' }),
    ]);

    expect(names).toEqual(['host.name']);
  });

  it('sorts names alphabetically', () => {
    const names = toLeafScalarFieldNames([
      field({ name: 'zeta' }),
      field({ name: 'alpha' }),
      field({ name: 'mu' }),
    ]);

    expect(names).toEqual(['alpha', 'mu', 'zeta']);
  });

  it('ignores fields without a name', () => {
    const names = toLeafScalarFieldNames([
      field({ name: '' }),
      field({ name: 'host.name', type: 'keyword' }),
    ]);

    expect(names).toEqual(['host.name']);
  });
});
