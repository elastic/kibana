/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { buildQueryFilter } from './query_string_filter';

describe('Query string filter builder', () => {
  it('should be a function', () => {
    expect(typeof buildQueryFilter).toBe('function');
  });

  it('should return a query filter when passed a standard field', () => {
    expect(buildQueryFilter({ foo: 'bar' }, 'index', '')).toEqual({
      meta: {
        alias: '',
        index: 'index',
      },
      query: {
        foo: 'bar',
      },
    });
  });
});
