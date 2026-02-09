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
import { createFindItemsFn } from './strategy';
import type { TableListViewFindItemsFn } from './types';

/**
 * Creates a complete `FindItemsParams` object for testing.
 */
const createParams = (overrides?: Partial<FindItemsParams>): FindItemsParams => ({
  searchQuery: '',
  filters: {},
  sort: { field: 'title', direction: 'asc' },
  page: { index: 0, size: 20 },
  ...overrides,
});

describe('createFindItemsFn', () => {
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
    it('calls the consumer findItems with searchQuery and signal', async () => {
      const mockItems = [createMockItem('1')];
      const mockFindItems = createMockFindItems(mockItems);
      const findItems = createFindItemsFn(mockFindItems);

      await findItems(createParams({ searchQuery: 'test query' }));

      // Forwards searchQuery, undefined for refs, and undefined for signal.
      expect(mockFindItems).toHaveBeenCalledWith('test query', undefined, undefined);
    });

    it('forwards abort signal to consumer findItems', async () => {
      const mockItems = [createMockItem('1')];
      const mockFindItems = createMockFindItems(mockItems);
      const findItems = createFindItemsFn(mockFindItems);
      const controller = new AbortController();

      await findItems(createParams({ signal: controller.signal }));

      expect(mockFindItems).toHaveBeenCalledWith('', undefined, controller.signal);
    });

    it('returns transformed items and total from consumer findItems', async () => {
      const mockItems = [createMockItem('1'), createMockItem('2')];
      const mockFindItems = createMockFindItems(mockItems);
      const findItems = createFindItemsFn(mockFindItems);

      const result = await findItems(createParams());

      // Items should be transformed to ContentListItem format.
      expect(result.items).toEqual([
        {
          id: '1',
          title: 'Dashboard 1',
          description: 'Description for 1',
          type: 'dashboard',
          updatedAt: new Date('2024-01-15T10:30:00.000Z'),
        },
        {
          id: '2',
          title: 'Dashboard 2',
          description: 'Description for 2',
          type: 'dashboard',
          updatedAt: new Date('2024-01-15T10:30:00.000Z'),
        },
      ]);
      expect(result.total).toBe(2);
    });

    it('handles empty results', async () => {
      const mockFindItems = createMockFindItems([]);
      const findItems = createFindItemsFn(mockFindItems);

      const result = await findItems(createParams());

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('propagates errors from consumer findItems', async () => {
      const mockFindItems = jest.fn().mockRejectedValue(new Error('Network error'));
      const findItems = createFindItemsFn(mockFindItems);

      await expect(findItems(createParams())).rejects.toThrow('Network error');
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
      const findItems = createFindItemsFn(mockFindItems);

      const result = await findItems(createParams({ sort: { field: 'title', direction: 'asc' } }));

      expect(result.items.map((i) => i.id)).toEqual(['1', '2', '3']);
    });

    it('sorts items by field in descending order', async () => {
      const mockItems = [
        createItemWithTitle('1', 'Alpha'),
        createItemWithTitle('3', 'Charlie'),
        createItemWithTitle('2', 'Bravo'),
      ];
      const mockFindItems = createMockFindItems(mockItems);
      const findItems = createFindItemsFn(mockFindItems);

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
      const findItems = createFindItemsFn(mockFindItems);

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
      const findItems = createFindItemsFn(mockFindItems);

      // Use sort: undefined to test pagination without sorting interference.
      const result = await findItems(
        createParams({ sort: undefined, page: { index: 0, size: 3 } })
      );

      expect(result.items).toHaveLength(3);
      expect(result.items.map((i) => i.id)).toEqual(['1', '2', '3']);
      expect(result.total).toBe(10);
    });

    it('returns correct page for non-zero index', async () => {
      const mockItems = Array.from({ length: 10 }, (_, i) => createMockItem(String(i + 1)));
      const mockFindItems = createMockFindItems(mockItems);
      const findItems = createFindItemsFn(mockFindItems);

      // Use sort: undefined to test pagination without sorting interference.
      const result = await findItems(
        createParams({ sort: undefined, page: { index: 1, size: 3 } })
      );

      expect(result.items).toHaveLength(3);
      expect(result.items.map((i) => i.id)).toEqual(['4', '5', '6']);
    });

    it('returns remaining items for last partial page', async () => {
      const mockItems = Array.from({ length: 5 }, (_, i) => createMockItem(String(i + 1)));
      const mockFindItems = createMockFindItems(mockItems);
      const findItems = createFindItemsFn(mockFindItems);

      const result = await findItems(createParams({ page: { index: 1, size: 3 } }));

      expect(result.items).toHaveLength(2);
      expect(result.items.map((i) => i.id)).toEqual(['4', '5']);
    });

    it('returns empty array for out-of-bounds page', async () => {
      const mockItems = [createMockItem('1')];
      const mockFindItems = createMockFindItems(mockItems);
      const findItems = createFindItemsFn(mockFindItems);

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
      const findItems = createFindItemsFn(mockFindItems);

      const result = await findItems(
        createParams({ sort: { field: 'id', direction: 'asc' }, page: { index: 0, size: 2 } })
      );

      // Items should be sorted first, then paginated.
      expect(result.items.map((i) => i.id)).toEqual(['1', '2']);
    });
  });
});
