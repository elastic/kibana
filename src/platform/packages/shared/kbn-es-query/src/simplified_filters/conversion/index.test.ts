/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SimplifiedFilter } from '@kbn/es-query-server';
import { FilterTransformer } from '.';

describe('FilterTransformer (Backward Compatibility)', () => {
  it('should provide the same API as the original class', () => {
    // Verify the static methods exist
    expect(typeof FilterTransformer.fromStoredFilter).toBe('function');
    expect(typeof FilterTransformer.toStoredFilter).toBe('function');
    expect(typeof FilterTransformer.validate).toBe('function');
  });

  it('should convert stored filters using the class API', () => {
    const storedFilter = {
      meta: { key: 'status', type: 'phrase', params: { query: 'active' } },
    };

    const result = FilterTransformer.fromStoredFilter(storedFilter);

    expect((result as any).condition).toEqual({
      field: 'status',
      operator: 'is',
      value: 'active',
    });
  });

  it('should convert simplified filters to stored format using the class API', () => {
    const simplified: SimplifiedFilter = {
      condition: {
        field: 'status',
        operator: 'is',
        value: 'active',
      },
    };

    const result = FilterTransformer.toStoredFilter(simplified);

    expect(result.query).toEqual({ term: { status: 'active' } });
    expect(result.meta.key).toBe('status');
  });

  it('should validate filters using the class API', () => {
    const validFilter: SimplifiedFilter = {
      condition: {
        field: 'status',
        operator: 'is',
        value: 'active',
      },
    };

    const result = FilterTransformer.validate(validFilter);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
