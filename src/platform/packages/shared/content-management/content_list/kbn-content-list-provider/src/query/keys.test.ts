/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { contentListKeys } from './keys';
import type { FindItemsParams } from '../datasource';

/**
 * Creates a complete FindItemsParams object for testing.
 */
const createParams = (
  overrides?: Partial<Omit<FindItemsParams, 'signal'>>
): Omit<FindItemsParams, 'signal'> => ({
  searchQuery: '',
  filters: {},
  sort: { field: 'title', direction: 'asc' },
  page: { index: 0, size: 20 },
  ...overrides,
});

describe('contentListKeys', () => {
  describe('all', () => {
    it('returns key with queryKeyScope', () => {
      const key = contentListKeys.all('dashboard-listing');

      expect(key).toEqual(['content-list', 'dashboard-listing']);
    });

    it('returns readonly array', () => {
      const key = contentListKeys.all('my-scope');

      // TypeScript ensures this is readonly, but we can verify the shape.
      expect(Array.isArray(key)).toBe(true);
    });

    it('creates unique keys for different scopes', () => {
      const key1 = contentListKeys.all('scope-a');
      const key2 = contentListKeys.all('scope-b');

      expect(key1).not.toEqual(key2);
    });
  });

  describe('items', () => {
    it('includes base key and items identifier with params', () => {
      const params = createParams({ searchQuery: 'test' });
      const key = contentListKeys.items('dashboard-listing', params);

      expect(key).toEqual(['content-list', 'dashboard-listing', 'items', params]);
    });

    it('handles complex params object', () => {
      const params = createParams({
        searchQuery: 'my search',
        sort: { field: 'title', direction: 'asc' },
        page: { index: 1, size: 20 },
      });
      const key = contentListKeys.items('my-scope', params);

      expect(key).toEqual(['content-list', 'my-scope', 'items', params]);
    });

    it('creates unique keys for different params', () => {
      const params1 = createParams({ searchQuery: 'test1' });
      const params2 = createParams({ searchQuery: 'test2' });

      const key1 = contentListKeys.items('dashboard-listing', params1);
      const key2 = contentListKeys.items('dashboard-listing', params2);

      expect(key1).not.toEqual(key2);
    });

    it('creates unique keys for different scopes', () => {
      const params = createParams();

      const key1 = contentListKeys.items('scope-a', params);
      const key2 = contentListKeys.items('scope-b', params);

      expect(key1).not.toEqual(key2);
    });
  });

  describe('key hierarchy', () => {
    it('items key starts with all key components', () => {
      const allKey = contentListKeys.all('my-scope');
      const itemsKey = contentListKeys.items('my-scope', createParams());

      // Items key should start with the same components as all key.
      expect(itemsKey.slice(0, allKey.length)).toEqual([...allKey]);
    });

    it('allows invalidating all queries for a scope using all key', () => {
      // This tests the expected behavior: all('dashboard-listing') should be a prefix
      // of items('dashboard-listing', ...), enabling React Query invalidation patterns.
      const allForScope = contentListKeys.all('dashboard-listing');
      const itemsForScope = contentListKeys.items(
        'dashboard-listing',
        createParams({ searchQuery: 'x' })
      );

      // The items key starts with ['content-list', 'dashboard-listing', ...].
      expect(itemsForScope[0]).toBe(allForScope[0]);
      expect(itemsForScope[1]).toBe(allForScope[1]);
    });
  });
});
