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
import { createClientStrategy } from './strategy';
import type { ItemDecorator } from './strategy';
import type { TableListViewFindItemsFn } from './types';

const createParams = (overrides?: Partial<FindItemsParams>): FindItemsParams => ({
  searchQuery: '',
  filters: {},
  sort: { field: 'title', direction: 'asc' },
  page: { index: 0, size: 20 },
  ...overrides,
});

describe('createClientStrategy', () => {
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
  ): jest.Mock<ReturnType<TableListViewFindItemsFn>> => {
    return jest.fn().mockResolvedValue({ hits: items, total: items.length });
  };

  describe('findItems', () => {
    it('calls the consumer with searchQuery and signal', async () => {
      const mockItems = [createMockItem('1')];
      const mockFindItems = createMockFindItems(mockItems);
      const { findItems } = createClientStrategy(mockFindItems);

      await findItems(createParams({ searchQuery: 'test query' }));

      expect(mockFindItems).toHaveBeenCalledWith('test query', undefined, undefined);
    });

    it('forwards abort signal to consumer findItems', async () => {
      const mockItems = [createMockItem('1')];
      const mockFindItems = createMockFindItems(mockItems);
      const { findItems } = createClientStrategy(mockFindItems);
      const controller = new AbortController();

      await findItems(createParams({ signal: controller.signal }));

      expect(mockFindItems).toHaveBeenCalledWith('', undefined, controller.signal);
    });

    it('transforms items to ContentListItem format', async () => {
      const mockItems = [createMockItem('1'), createMockItem('2')];
      const mockFindItems = createMockFindItems(mockItems);
      const { findItems } = createClientStrategy(mockFindItems);

      const result = await findItems(createParams({ sort: undefined }));

      expect(result.items).toEqual([
        expect.objectContaining({
          id: '1',
          title: 'Dashboard 1',
          description: 'Description for 1',
          type: 'dashboard',
          updatedAt: new Date('2024-01-15T10:30:00.000Z'),
        }),
        expect.objectContaining({
          id: '2',
          title: 'Dashboard 2',
          description: 'Description for 2',
          type: 'dashboard',
          updatedAt: new Date('2024-01-15T10:30:00.000Z'),
        }),
      ]);
      expect(result.total).toBe(2);
    });

    it('handles empty results', async () => {
      const mockFindItems = createMockFindItems([]);
      const { findItems } = createClientStrategy(mockFindItems);

      const result = await findItems(createParams());

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('propagates errors from consumer findItems', async () => {
      const mockFindItems = jest.fn().mockRejectedValue(new Error('Network error'));
      const { findItems } = createClientStrategy(mockFindItems);

      await expect(findItems(createParams())).rejects.toThrow('Network error');
    });
  });

  describe('caching', () => {
    it('does not call the server when searchQuery is unchanged', async () => {
      const mockItems = [createMockItem('1')];
      const mockFindItems = createMockFindItems(mockItems);
      const { findItems } = createClientStrategy(mockFindItems);

      await findItems(createParams({ searchQuery: 'test' }));
      await findItems(createParams({ searchQuery: 'test' }));

      expect(mockFindItems).toHaveBeenCalledTimes(1);
    });

    it('calls the server when searchQuery changes', async () => {
      const mockItems = [createMockItem('1')];
      const mockFindItems = createMockFindItems(mockItems);
      const { findItems } = createClientStrategy(mockFindItems);

      await findItems(createParams({ searchQuery: 'first' }));
      await findItems(createParams({ searchQuery: 'second' }));

      expect(mockFindItems).toHaveBeenCalledTimes(2);
    });

    it('reuses cached items when only filters change', async () => {
      const item1: UserContentCommonSchema = { ...createMockItem('1'), createdBy: 'u_jane' };
      const item2: UserContentCommonSchema = { ...createMockItem('2'), createdBy: 'u_diego' };
      const mockFindItems = createMockFindItems([item1, item2]);
      const { findItems } = createClientStrategy(mockFindItems);

      await findItems(createParams({ searchQuery: 'test' }));
      const result = await findItems(
        createParams({
          searchQuery: 'test',
          filters: { createdBy: { include: ['u_jane'] } },
        })
      );

      expect(mockFindItems).toHaveBeenCalledTimes(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('1');
    });
  });

  describe('onInvalidate', () => {
    it('forces a server fetch on the next findItems call', async () => {
      const mockItems = [createMockItem('1')];
      const mockFindItems = createMockFindItems(mockItems);
      const { findItems, onInvalidate } = createClientStrategy(mockFindItems);

      await findItems(createParams({ searchQuery: 'test' }));
      expect(mockFindItems).toHaveBeenCalledTimes(1);

      onInvalidate();
      await findItems(createParams({ searchQuery: 'test' }));
      expect(mockFindItems).toHaveBeenCalledTimes(2);
    });

    it('picks up server changes after invalidation', async () => {
      const mockFindItems = jest
        .fn<ReturnType<TableListViewFindItemsFn>, Parameters<TableListViewFindItemsFn>>()
        .mockResolvedValueOnce({
          hits: [createMockItem('1'), createMockItem('2')],
          total: 2,
        })
        .mockResolvedValueOnce({
          hits: [createMockItem('1')],
          total: 1,
        });

      const { findItems, onInvalidate } = createClientStrategy(mockFindItems);

      const first = await findItems(createParams());
      expect(first.total).toBe(2);

      onInvalidate();
      const second = await findItems(createParams());
      expect(second.total).toBe(1);
    });
  });

  describe('filtering', () => {
    it('applies createdBy include filter', async () => {
      const item1: UserContentCommonSchema = { ...createMockItem('1'), createdBy: 'u_jane' };
      const item2: UserContentCommonSchema = { ...createMockItem('2'), createdBy: 'u_diego' };
      const mockFindItems = createMockFindItems([item1, item2]);
      const { findItems } = createClientStrategy(mockFindItems);

      const result = await findItems(
        createParams({ filters: { createdBy: { include: ['u_jane'] } } })
      );

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('1');
    });

    it('applies tag include filter', async () => {
      const item1: UserContentCommonSchema = {
        ...createMockItem('1'),
        references: [{ type: 'tag', id: 'tag-1', name: 'tag-1' }],
      };
      const item2: UserContentCommonSchema = {
        ...createMockItem('2'),
        references: [{ type: 'tag', id: 'tag-2', name: 'tag-2' }],
      };
      const mockFindItems = createMockFindItems([item1, item2]);
      const { findItems } = createClientStrategy(mockFindItems);

      const result = await findItems(createParams({ filters: { tag: { include: ['tag-1'] } } }));

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('1');
    });

    it('applies starred filter via decorate + IncludeExcludeFlag', async () => {
      const mockItems = [createMockItem('1'), createMockItem('2'), createMockItem('3')];
      const mockFindItems = createMockFindItems(mockItems);
      const decorate: ItemDecorator = async (items) => {
        const favoriteIds = new Set(['1', '3']);
        return items.map((item) => ({ ...item, starred: favoriteIds.has(item.id) }));
      };
      const { findItems } = createClientStrategy(mockFindItems, decorate);

      const result = await findItems(createParams({ filters: { starred: { state: 'include' } } }));

      expect(result.items.map((i) => i.id)).toEqual(['1', '3']);
    });
  });

  describe('sorting', () => {
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
      const { findItems } = createClientStrategy(createMockFindItems(mockItems));

      const result = await findItems(createParams({ sort: { field: 'title', direction: 'asc' } }));

      expect(result.items.map((i) => i.id)).toEqual(['1', '2', '3']);
    });

    it('sorts items by field in descending order', async () => {
      const mockItems = [
        createItemWithTitle('1', 'Alpha'),
        createItemWithTitle('3', 'Charlie'),
        createItemWithTitle('2', 'Bravo'),
      ];
      const { findItems } = createClientStrategy(createMockFindItems(mockItems));

      const result = await findItems(createParams({ sort: { field: 'id', direction: 'desc' } }));

      expect(result.items.map((i) => i.id)).toEqual(['3', '2', '1']);
    });

    it('pushes null values to the end regardless of direction', async () => {
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

      const { findItems } = createClientStrategy(mockFindItems);
      const resultAsc = await findItems(
        createParams({ sort: { field: 'updatedAt', direction: 'asc' } })
      );
      expect(resultAsc.items[resultAsc.items.length - 1].id).toBe('2');

      const { findItems: findItems2 } = createClientStrategy(mockFindItems);
      const resultDesc = await findItems2(
        createParams({ sort: { field: 'updatedAt', direction: 'desc' } })
      );
      expect(resultDesc.items[resultDesc.items.length - 1].id).toBe('2');
    });
  });

  describe('pagination', () => {
    it('returns paginated subset of items', async () => {
      const mockItems = Array.from({ length: 10 }, (_, i) => createMockItem(String(i + 1)));
      const { findItems } = createClientStrategy(createMockFindItems(mockItems));

      const result = await findItems(
        createParams({ sort: undefined, page: { index: 0, size: 3 } })
      );

      expect(result.items).toHaveLength(3);
      expect(result.items.map((i) => i.id)).toEqual(['1', '2', '3']);
      expect(result.total).toBe(10);
    });

    it('returns correct page for non-zero index', async () => {
      const mockItems = Array.from({ length: 10 }, (_, i) => createMockItem(String(i + 1)));
      const { findItems } = createClientStrategy(createMockFindItems(mockItems));

      const result = await findItems(
        createParams({ sort: undefined, page: { index: 1, size: 3 } })
      );

      expect(result.items).toHaveLength(3);
      expect(result.items.map((i) => i.id)).toEqual(['4', '5', '6']);
    });

    it('returns remaining items for last partial page', async () => {
      const mockItems = Array.from({ length: 5 }, (_, i) => createMockItem(String(i + 1)));
      const { findItems } = createClientStrategy(createMockFindItems(mockItems));

      const result = await findItems(createParams({ page: { index: 1, size: 3 } }));

      expect(result.items).toHaveLength(2);
      expect(result.items.map((i) => i.id)).toEqual(['4', '5']);
    });

    it('returns empty array for out-of-bounds page', async () => {
      const mockItems = [createMockItem('1')];
      const { findItems } = createClientStrategy(createMockFindItems(mockItems));

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
      const { findItems } = createClientStrategy(createMockFindItems(mockItems));

      const result = await findItems(
        createParams({ sort: { field: 'id', direction: 'asc' }, page: { index: 0, size: 2 } })
      );

      expect(result.items.map((i) => i.id)).toEqual(['1', '2']);
    });
  });

  describe('decorate', () => {
    it('applies decorate callback at cache-fill time', async () => {
      const mockItems = [createMockItem('1'), createMockItem('2')];
      const mockFindItems = createMockFindItems(mockItems);
      const decorate: ItemDecorator = async (items) =>
        items.map((item) => ({ ...item, starred: item.id === '1' }));
      const { findItems, getItems } = createClientStrategy(mockFindItems, decorate);

      await findItems(createParams());

      const decorated = getItems() as unknown as Array<{ starred: boolean }>;
      expect(decorated[0].starred).toBe(true);
      expect(decorated[1].starred).toBe(false);
    });
  });

  describe('onRefresh', () => {
    it('re-decorates items without a server fetch', async () => {
      const mockItems = [createMockItem('1'), createMockItem('2')];
      const mockFindItems = createMockFindItems(mockItems);
      let favoriteIds = new Set(['1']);
      const decorate: ItemDecorator = async (items) =>
        items.map((item) => ({ ...item, starred: favoriteIds.has(item.id) }));
      const { findItems, onRefresh, getItems } = createClientStrategy(mockFindItems, decorate);

      await findItems(createParams());
      let decorated = getItems() as unknown as Array<{ starred: boolean }>;
      expect(decorated[0].starred).toBe(true);
      expect(decorated[1].starred).toBe(false);

      favoriteIds = new Set(['2']);
      await onRefresh();

      expect(mockFindItems).toHaveBeenCalledTimes(1);
      decorated = getItems() as unknown as Array<{ starred: boolean }>;
      expect(decorated[0].starred).toBe(false);
      expect(decorated[1].starred).toBe(true);
    });
  });

  describe('getItems', () => {
    it('returns decorated items from the most recent fetch', async () => {
      const mockItems = [createMockItem('1'), createMockItem('2')];
      const mockFindItems = createMockFindItems(mockItems);
      const { findItems, getItems } = createClientStrategy(mockFindItems);

      await findItems(createParams());

      expect(getItems()).toEqual(mockItems);
    });
  });
});
