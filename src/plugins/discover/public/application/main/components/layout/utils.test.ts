/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { Filter } from '@kbn/es-query';
import { hasActiveFilter } from './utils';

const testFilter: Filter = {
  meta: {
    alias: null,
    disabled: false,
    negate: false,
  },
  query: { query: 'hi' },
};
const testFilterDisabled: Filter = {
  meta: {
    alias: null,
    disabled: true,
    negate: false,
  },
  query: { query: 'hi' },
};

const testFilterBroken = {} as Filter;

describe('hasActiveFilter', () => {
  test('only active filters', () => {
    const filters = [testFilter];
    const result = hasActiveFilter(filters);
    expect(result).toBe(true);
  });
  test('only disabled filters', () => {
    const filters = [testFilterDisabled];
    const result = hasActiveFilter(filters);
    expect(result).toBe(false);
  });
  test('disabled and active filters', () => {
    const filters = [testFilter, testFilterDisabled];
    const result = hasActiveFilter(filters);
    expect(result).toBe(true);
  });
  test('broken filter - edge case', () => {
    const filters = [testFilterBroken];
    const result = hasActiveFilter(filters);
    expect(result).toBe(true);
  });
});
