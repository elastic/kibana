/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import type { FindItemsParams } from '@kbn/content-list-provider';
import { createFindItemsAdapter } from './strategy';
import type { TableListViewFindItemsFn } from './strategy';

/**
 * Creates a complete FindItemsParams object for testing.
 */
const createParams = (overrides?: Partial<FindItemsParams>): FindItemsParams => ({
  searchQuery: '',
  filters: {},
  sort: { field: 'title', direction: 'asc' },
  page: { index: 0, size: 20 },
  ...overrides,
});

describe('createFindItemsAdapter', () => {
  const createMockItem = (id: string): UserContentCommonSchema => ({
    id,
    type: 'dashboard',
    updatedAt: '2024-01-15T10:30:00.000Z',
    references: [],
    attributes: {
      title: `Dashboard ${id}`,
      description: `Description for ${id}`,
    },
  });

  const createMockFindItems = (
    items: UserContentCommonSchema[] = []
  ): jest.Mock<ReturnType<TableListViewFindItemsFn<UserContentCommonSchema>>> => {
    return jest.fn().mockResolvedValue({ hits: items, total: items.length });
  };

  describe('findItems', () => {
    it('calls the consumer findItems with searchQuery', async () => {
      const mockItems = [createMockItem('1')];
      const mockFindItems = createMockFindItems(mockItems);
      const { findItems } = createFindItemsAdapter({ findItems: mockFindItems });

      await findItems(createParams({ searchQuery: 'test query' }));

      expect(mockFindItems).toHaveBeenCalledWith('test query');
    });

    it('returns items and total from consumer findItems', async () => {
      const mockItems = [createMockItem('1'), createMockItem('2')];
      const mockFindItems = createMockFindItems(mockItems);
      const { findItems } = createFindItemsAdapter({ findItems: mockFindItems });

      const result = await findItems(createParams());

      expect(result.items).toEqual(mockItems);
      expect(result.total).toBe(2);
    });

    it('handles empty results', async () => {
      const mockFindItems = createMockFindItems([]);
      const { findItems } = createFindItemsAdapter({ findItems: mockFindItems });

      const result = await findItems(createParams());

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('propagates errors from consumer findItems', async () => {
      const mockFindItems = jest.fn().mockRejectedValue(new Error('Network error'));
      const { findItems } = createFindItemsAdapter({ findItems: mockFindItems });

      await expect(findItems(createParams())).rejects.toThrow('Network error');
    });
  });

  describe('caching behavior', () => {
    it('caches result for same params', async () => {
      const mockItems = [createMockItem('1')];
      const mockFindItems = createMockFindItems(mockItems);
      const { findItems } = createFindItemsAdapter({ findItems: mockFindItems });

      // First call.
      await findItems(createParams({ searchQuery: 'cached' }));
      // Second call with same params.
      await findItems(createParams({ searchQuery: 'cached' }));

      expect(mockFindItems).toHaveBeenCalledTimes(1);
    });

    it('returns cached data for same params', async () => {
      const mockItems = [createMockItem('1')];
      const mockFindItems = createMockFindItems(mockItems);
      const { findItems } = createFindItemsAdapter({ findItems: mockFindItems });

      const result1 = await findItems(createParams({ searchQuery: 'cached' }));
      const result2 = await findItems(createParams({ searchQuery: 'cached' }));

      expect(result1.items).toEqual(result2.items);
      expect(result1.total).toBe(result2.total);
    });

    it('uses cached data when only sort params change', async () => {
      const mockItems = [createMockItem('1')];
      const mockFindItems = createMockFindItems(mockItems);
      const { findItems } = createFindItemsAdapter({ findItems: mockFindItems });

      await findItems(
        createParams({ searchQuery: 'query', sort: { field: 'title', direction: 'asc' } })
      );
      await findItems(
        createParams({ searchQuery: 'query', sort: { field: 'updatedAt', direction: 'desc' } })
      );

      // Same searchQuery, so cache should be used (sort is handled client-side).
      expect(mockFindItems).toHaveBeenCalledTimes(1);
    });

    it('fetches fresh data when searchQuery changes', async () => {
      const mockFindItems = jest
        .fn()
        .mockResolvedValueOnce({ hits: [createMockItem('1')], total: 1 })
        .mockResolvedValueOnce({ hits: [createMockItem('2')], total: 1 });

      const { findItems } = createFindItemsAdapter({ findItems: mockFindItems });

      await findItems(createParams({ searchQuery: 'first' }));
      await findItems(createParams({ searchQuery: 'second' }));

      expect(mockFindItems).toHaveBeenCalledTimes(2);
    });

    it('uses cached data when only page params change', async () => {
      const mockItems = [createMockItem('1'), createMockItem('2'), createMockItem('3')];
      const mockFindItems = createMockFindItems(mockItems);
      const { findItems } = createFindItemsAdapter({ findItems: mockFindItems });

      // First call fetches data.
      await findItems(createParams({ searchQuery: 'first', page: { index: 0, size: 20 } }));
      // Second call with different page uses cache.
      await findItems(createParams({ searchQuery: 'first', page: { index: 1, size: 20 } }));
      // Third call with first page uses cache.
      await findItems(createParams({ searchQuery: 'first', page: { index: 0, size: 20 } }));

      // Same searchQuery, so cache should be used (pagination is handled client-side).
      expect(mockFindItems).toHaveBeenCalledTimes(1);
    });

    it('invalidates cache when searchQuery changes', async () => {
      const mockFindItems = jest
        .fn()
        .mockResolvedValueOnce({ hits: [createMockItem('1')], total: 1 })
        .mockResolvedValueOnce({ hits: [createMockItem('2')], total: 1 });

      const { findItems } = createFindItemsAdapter({ findItems: mockFindItems });

      const result1 = await findItems(createParams({ searchQuery: 'first' }));
      const result2 = await findItems(createParams({ searchQuery: 'second' }));

      expect(mockFindItems).toHaveBeenCalledTimes(2);
      expect(result1.items[0].id).toBe('1');
      expect(result2.items[0].id).toBe('2');
    });

    it('handles default params for caching', async () => {
      const mockItems = [createMockItem('1')];
      const mockFindItems = createMockFindItems(mockItems);
      const { findItems } = createFindItemsAdapter({ findItems: mockFindItems });

      await findItems(createParams());
      await findItems(createParams());

      expect(mockFindItems).toHaveBeenCalledTimes(1);
    });
  });

  describe('client-side sorting', () => {
    const createItemWithTitle = (id: string, title: string): UserContentCommonSchema => ({
      id,
      type: 'dashboard',
      updatedAt: '2024-01-15T10:30:00.000Z',
      references: [],
      attributes: { title, description: '' },
    });

    it('sorts items by field in ascending order', async () => {
      const mockItems = [
        createItemWithTitle('3', 'Charlie'),
        createItemWithTitle('1', 'Alpha'),
        createItemWithTitle('2', 'Bravo'),
      ];
      const mockFindItems = createMockFindItems(mockItems);
      const { findItems } = createFindItemsAdapter({ findItems: mockFindItems });

      const result = await findItems(
        createParams({ sort: { field: 'attributes.title', direction: 'asc' } })
      );

      expect(result.items.map((i) => i.id)).toEqual(['1', '2', '3']);
    });

    it('sorts items by field in descending order', async () => {
      const mockItems = [
        createItemWithTitle('1', 'Alpha'),
        createItemWithTitle('3', 'Charlie'),
        createItemWithTitle('2', 'Bravo'),
      ];
      const mockFindItems = createMockFindItems(mockItems);
      const { findItems } = createFindItemsAdapter({ findItems: mockFindItems });

      const result = await findItems(createParams({ sort: { field: 'id', direction: 'desc' } }));

      expect(result.items.map((i) => i.id)).toEqual(['3', '2', '1']);
    });

    it('handles null values when sorting - nulls always last', async () => {
      const itemWithNull: UserContentCommonSchema = {
        id: '2',
        type: 'dashboard',
        updatedAt: undefined as unknown as string,
        references: [],
        attributes: { title: 'No date', description: '' },
      };
      const mockItems = [
        createItemWithTitle('1', 'Has date'),
        itemWithNull,
        createItemWithTitle('3', 'Also has date'),
      ];
      const mockFindItems = createMockFindItems(mockItems);
      const { findItems } = createFindItemsAdapter({ findItems: mockFindItems });

      // Ascending order - nulls should be last.
      const resultAsc = await findItems(
        createParams({ sort: { field: 'updatedAt', direction: 'asc' } })
      );
      expect(resultAsc.items[resultAsc.items.length - 1].id).toBe('2');

      // Descending order - nulls should still be last (matches TableListView behavior).
      const resultDesc = await findItems(
        createParams({ sort: { field: 'updatedAt', direction: 'desc' } })
      );
      expect(resultDesc.items[resultDesc.items.length - 1].id).toBe('2');
    });
  });

  describe('client-side pagination', () => {
    it('returns paginated subset of items', async () => {
      const mockItems = Array.from({ length: 10 }, (_, i) => createMockItem(String(i + 1)));
      const mockFindItems = createMockFindItems(mockItems);
      const { findItems } = createFindItemsAdapter({ findItems: mockFindItems });

      const result = await findItems(createParams({ page: { index: 0, size: 3 } }));

      expect(result.items).toHaveLength(3);
      expect(result.items.map((i) => i.id)).toEqual(['1', '2', '3']);
      expect(result.total).toBe(10);
    });

    it('returns correct page for non-zero index', async () => {
      const mockItems = Array.from({ length: 10 }, (_, i) => createMockItem(String(i + 1)));
      const mockFindItems = createMockFindItems(mockItems);
      const { findItems } = createFindItemsAdapter({ findItems: mockFindItems });

      const result = await findItems(createParams({ page: { index: 1, size: 3 } }));

      expect(result.items).toHaveLength(3);
      expect(result.items.map((i) => i.id)).toEqual(['4', '5', '6']);
    });

    it('returns remaining items for last partial page', async () => {
      const mockItems = Array.from({ length: 5 }, (_, i) => createMockItem(String(i + 1)));
      const mockFindItems = createMockFindItems(mockItems);
      const { findItems } = createFindItemsAdapter({ findItems: mockFindItems });

      const result = await findItems(createParams({ page: { index: 1, size: 3 } }));

      expect(result.items).toHaveLength(2);
      expect(result.items.map((i) => i.id)).toEqual(['4', '5']);
    });

    it('returns empty array for out-of-bounds page', async () => {
      const mockItems = [createMockItem('1')];
      const mockFindItems = createMockFindItems(mockItems);
      const { findItems } = createFindItemsAdapter({ findItems: mockFindItems });

      const result = await findItems(createParams({ page: { index: 10, size: 20 } }));

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(1);
    });

    it('applies sorting before pagination', async () => {
      const mockItems = [
        createMockItem('3'),
        createMockItem('1'),
        createMockItem('4'),
        createMockItem('2'),
      ];
      const mockFindItems = createMockFindItems(mockItems);
      const { findItems } = createFindItemsAdapter({ findItems: mockFindItems });

      const result = await findItems(
        createParams({ sort: { field: 'id', direction: 'asc' }, page: { index: 0, size: 2 } })
      );

      // Items should be sorted first, then paginated.
      expect(result.items.map((i) => i.id)).toEqual(['1', '2']);
    });
  });

  describe('clearCache', () => {
    it('clears the cached result', async () => {
      const mockItems = [createMockItem('1')];
      const mockFindItems = createMockFindItems(mockItems);
      const { findItems, clearCache } = createFindItemsAdapter({ findItems: mockFindItems });

      await findItems(createParams({ searchQuery: 'test' }));
      clearCache();
      await findItems(createParams({ searchQuery: 'test' }));

      expect(mockFindItems).toHaveBeenCalledTimes(2);
    });

    it('allows fresh fetch after clearing', async () => {
      const mockFindItems = jest
        .fn()
        .mockResolvedValueOnce({ hits: [createMockItem('old')], total: 1 })
        .mockResolvedValueOnce({ hits: [createMockItem('new')], total: 1 });

      const { findItems, clearCache } = createFindItemsAdapter({ findItems: mockFindItems });

      const result1 = await findItems(createParams({ searchQuery: 'query' }));
      clearCache();
      const result2 = await findItems(createParams({ searchQuery: 'query' }));

      expect(result1.items[0].id).toBe('old');
      expect(result2.items[0].id).toBe('new');
    });

    it('can be called multiple times safely', () => {
      const mockFindItems = createMockFindItems([]);
      const { clearCache } = createFindItemsAdapter({ findItems: mockFindItems });

      expect(() => {
        clearCache();
        clearCache();
        clearCache();
      }).not.toThrow();
    });

    it('can be called before any findItems calls', async () => {
      const mockItems = [createMockItem('1')];
      const mockFindItems = createMockFindItems(mockItems);
      const { findItems, clearCache } = createFindItemsAdapter({ findItems: mockFindItems });

      clearCache();
      const result = await findItems(createParams());

      expect(result.items).toEqual(mockItems);
    });
  });

  describe('adapter isolation', () => {
    it('creates independent adapters with separate caches', async () => {
      const mockFindItems1 = createMockFindItems([createMockItem('adapter1')]);
      const mockFindItems2 = createMockFindItems([createMockItem('adapter2')]);

      const adapter1 = createFindItemsAdapter({ findItems: mockFindItems1 });
      const adapter2 = createFindItemsAdapter({ findItems: mockFindItems2 });

      const result1 = await adapter1.findItems(createParams({ searchQuery: 'same' }));
      const result2 = await adapter2.findItems(createParams({ searchQuery: 'same' }));

      expect(result1.items[0].id).toBe('adapter1');
      expect(result2.items[0].id).toBe('adapter2');
    });

    it('clearCache on one adapter does not affect another', async () => {
      const mockFindItems1 = createMockFindItems([createMockItem('1')]);
      const mockFindItems2 = createMockFindItems([createMockItem('2')]);

      const adapter1 = createFindItemsAdapter({ findItems: mockFindItems1 });
      const adapter2 = createFindItemsAdapter({ findItems: mockFindItems2 });

      await adapter1.findItems(createParams({ searchQuery: 'test' }));
      await adapter2.findItems(createParams({ searchQuery: 'test' }));

      adapter1.clearCache();

      // Adapter 1 should refetch.
      await adapter1.findItems(createParams({ searchQuery: 'test' }));
      // Adapter 2 should still use cache.
      await adapter2.findItems(createParams({ searchQuery: 'test' }));

      expect(mockFindItems1).toHaveBeenCalledTimes(2);
      expect(mockFindItems2).toHaveBeenCalledTimes(1);
    });
  });

  describe('concurrent requests', () => {
    it('handles concurrent calls with same searchQuery', async () => {
      // Use a delayed mock that resolves after a short delay.
      const mockFindItems = jest.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({ hits: [createMockItem('1')], total: 1 });
            }, 10);
          })
      );

      const { findItems } = createFindItemsAdapter({ findItems: mockFindItems });

      // Start two concurrent requests.
      const promise1 = findItems(createParams({ searchQuery: 'concurrent' }));
      const promise2 = findItems(createParams({ searchQuery: 'concurrent' }));

      const [result1, result2] = await Promise.all([promise1, promise2]);

      // Both should get results (though they may be different calls).
      expect(result1.items).toHaveLength(1);
      expect(result2.items).toHaveLength(1);
      // Both calls happen since cache wasn't populated yet when second call started.
      expect(mockFindItems).toHaveBeenCalledTimes(2);
    });
  });
});
