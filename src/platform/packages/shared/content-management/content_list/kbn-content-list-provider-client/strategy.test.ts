/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import { createFindItemsAdapter, type TableListViewFindItemsFn } from './strategy';

/**
 * Creates a mock item for testing.
 */
const createMockItem = (
  id: string,
  title: string,
  overrides: Partial<UserContentCommonSchema> = {}
): UserContentCommonSchema => ({
  id,
  type: 'dashboard',
  updatedAt: `2024-01-${String(parseInt(id, 10)).padStart(2, '0')}T00:00:00Z`,
  createdAt: '2024-01-01T00:00:00Z',
  createdBy: `user-${id}`,
  managed: false,
  references: [{ type: 'tag', id: 'tag-1', name: 'Tag 1' }],
  attributes: {
    title,
    description: `Description for ${title}`,
  },
  ...overrides,
});

const defaultFindParams = {
  searchQuery: '',
  filters: { tags: { include: [], exclude: [] } },
  sort: { field: 'updatedAt', direction: 'desc' as const },
  page: { index: 0, size: 10 },
};

describe('createFindItemsAdapter', () => {
  it('creates a findItems function', () => {
    const mockConsumerFindItems: TableListViewFindItemsFn<UserContentCommonSchema> = jest
      .fn()
      .mockResolvedValue({ total: 0, hits: [] });

    const { findItems } = createFindItemsAdapter({ findItems: mockConsumerFindItems });

    expect(typeof findItems).toBe('function');
  });

  describe('findItems', () => {
    it('calls consumer findItems with searchQuery', async () => {
      const mockConsumerFindItems = jest.fn().mockResolvedValue({
        total: 2,
        hits: [createMockItem('1', 'Dashboard 1'), createMockItem('2', 'Dashboard 2')],
      });

      const { findItems } = createFindItemsAdapter({ findItems: mockConsumerFindItems });

      const result = await findItems({
        ...defaultFindParams,
        searchQuery: 'test query',
      });

      expect(mockConsumerFindItems).toHaveBeenCalledWith('test query', {
        references: undefined,
        referencesToExclude: undefined,
      });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('maps tag include filters to references', async () => {
      const mockConsumerFindItems = jest.fn().mockResolvedValue({ total: 0, hits: [] });

      const { findItems } = createFindItemsAdapter({ findItems: mockConsumerFindItems });

      await findItems({
        ...defaultFindParams,
        filters: {
          tags: { include: ['tag-1', 'tag-2'], exclude: [] },
        },
      });

      expect(mockConsumerFindItems).toHaveBeenCalledWith('', {
        references: [
          { type: 'tag', id: 'tag-1' },
          { type: 'tag', id: 'tag-2' },
        ],
        referencesToExclude: undefined,
      });
    });

    it('maps tag exclude filters to referencesToExclude', async () => {
      const mockConsumerFindItems = jest.fn().mockResolvedValue({ total: 0, hits: [] });

      const { findItems } = createFindItemsAdapter({ findItems: mockConsumerFindItems });

      await findItems({
        ...defaultFindParams,
        filters: {
          tags: { include: [], exclude: ['tag-3'] },
        },
      });

      expect(mockConsumerFindItems).toHaveBeenCalledWith('', {
        references: undefined,
        referencesToExclude: [{ type: 'tag', id: 'tag-3' }],
      });
    });

    it('passes both include and exclude tags', async () => {
      const mockConsumerFindItems = jest.fn().mockResolvedValue({ total: 0, hits: [] });

      const { findItems } = createFindItemsAdapter({ findItems: mockConsumerFindItems });

      await findItems({
        ...defaultFindParams,
        filters: {
          tags: { include: ['tag-1'], exclude: ['tag-2'] },
        },
      });

      expect(mockConsumerFindItems).toHaveBeenCalledWith('', {
        references: [{ type: 'tag', id: 'tag-1' }],
        referencesToExclude: [{ type: 'tag', id: 'tag-2' }],
      });
    });

    describe('client-side user filtering', () => {
      it('filters items by createdBy when users filter is provided', async () => {
        const mockConsumerFindItems = jest.fn().mockResolvedValue({
          total: 3,
          hits: [
            createMockItem('1', 'Dashboard 1', { createdBy: 'user-1' }),
            createMockItem('2', 'Dashboard 2', { createdBy: 'user-2' }),
            createMockItem('3', 'Dashboard 3', { createdBy: 'user-1' }),
          ],
        });

        const { findItems } = createFindItemsAdapter({ findItems: mockConsumerFindItems });

        const result = await findItems({
          ...defaultFindParams,
          filters: {
            tags: { include: [], exclude: [] },
            users: ['user-1'],
          },
        });

        expect(result.items).toHaveLength(2);
        // Sorted by updatedAt desc, so order may vary. Just check both items are present.
        expect(result.items.map((i) => i.id).sort()).toEqual(['1', '3']);
        expect(result.total).toBe(2);
      });

      it('excludes items without createdBy when filtering by users', async () => {
        const mockConsumerFindItems = jest.fn().mockResolvedValue({
          total: 2,
          hits: [
            createMockItem('1', 'No creator', { createdBy: undefined }),
            createMockItem('2', 'Has creator', { createdBy: 'user-1' }),
          ],
        });

        const { findItems } = createFindItemsAdapter({ findItems: mockConsumerFindItems });

        const result = await findItems({
          ...defaultFindParams,
          filters: {
            tags: { include: [], exclude: [] },
            users: ['user-1'],
          },
        });

        expect(result.items).toHaveLength(1);
        expect(result.items[0].id).toBe('2');
      });

      it('supports multiple user IDs in filter', async () => {
        const mockConsumerFindItems = jest.fn().mockResolvedValue({
          total: 3,
          hits: [
            createMockItem('1', 'Dashboard 1', { createdBy: 'user-1' }),
            createMockItem('2', 'Dashboard 2', { createdBy: 'user-2' }),
            createMockItem('3', 'Dashboard 3', { createdBy: 'user-3' }),
          ],
        });

        const { findItems } = createFindItemsAdapter({ findItems: mockConsumerFindItems });

        const result = await findItems({
          ...defaultFindParams,
          filters: {
            tags: { include: [], exclude: [] },
            users: ['user-1', 'user-3'],
          },
        });

        expect(result.items).toHaveLength(2);
        // Sorted by updatedAt desc, so order may vary. Just check both items are present.
        expect(result.items.map((i) => i.id).sort()).toEqual(['1', '3']);
      });
    });

    describe('client-side sorting', () => {
      it('sorts items by title ascending', async () => {
        const mockConsumerFindItems = jest.fn().mockResolvedValue({
          total: 3,
          hits: [
            createMockItem('1', 'Zebra'),
            createMockItem('2', 'Apple'),
            createMockItem('3', 'Mango'),
          ],
        });

        const { findItems } = createFindItemsAdapter({ findItems: mockConsumerFindItems });

        const result = await findItems({
          ...defaultFindParams,
          sort: { field: 'title', direction: 'asc' },
        });

        expect(result.items.map((i) => i.attributes.title)).toEqual(['Apple', 'Mango', 'Zebra']);
      });

      it('sorts items by title descending', async () => {
        const mockConsumerFindItems = jest.fn().mockResolvedValue({
          total: 3,
          hits: [
            createMockItem('1', 'Apple'),
            createMockItem('2', 'Zebra'),
            createMockItem('3', 'Mango'),
          ],
        });

        const { findItems } = createFindItemsAdapter({ findItems: mockConsumerFindItems });

        const result = await findItems({
          ...defaultFindParams,
          sort: { field: 'title', direction: 'desc' },
        });

        expect(result.items.map((i) => i.attributes.title)).toEqual(['Zebra', 'Mango', 'Apple']);
      });

      it('sorts items by updatedAt', async () => {
        const mockConsumerFindItems = jest.fn().mockResolvedValue({
          total: 3,
          hits: [
            createMockItem('1', 'First', { updatedAt: '2024-01-01T00:00:00Z' }),
            createMockItem('2', 'Second', { updatedAt: '2024-01-02T00:00:00Z' }),
            createMockItem('3', 'Third', { updatedAt: '2024-01-03T00:00:00Z' }),
          ],
        });

        const { findItems } = createFindItemsAdapter({ findItems: mockConsumerFindItems });

        const result = await findItems({
          ...defaultFindParams,
          sort: { field: 'updatedAt', direction: 'asc' },
        });

        expect(result.items.map((i) => i.id)).toEqual(['1', '2', '3']);
      });

      it('sorts by createdAt descending', async () => {
        const mockConsumerFindItems = jest.fn().mockResolvedValue({
          total: 2,
          hits: [
            createMockItem('1', 'Older', { createdAt: '2024-01-01T00:00:00Z' }),
            createMockItem('2', 'Newer', { createdAt: '2024-01-05T00:00:00Z' }),
          ],
        });

        const { findItems } = createFindItemsAdapter({ findItems: mockConsumerFindItems });

        const result = await findItems({
          ...defaultFindParams,
          sort: { field: 'createdAt', direction: 'desc' },
        });

        expect(result.items[0].attributes.title).toBe('Newer');
        expect(result.items[1].attributes.title).toBe('Older');
      });

      it('handles null values in sorting (pushes to end for asc)', async () => {
        const mockConsumerFindItems = jest.fn().mockResolvedValue({
          total: 2,
          hits: [
            createMockItem('1', 'Has date', { createdAt: '2024-01-02T00:00:00Z' }),
            createMockItem('2', 'No date', { createdAt: undefined }),
          ],
        });

        const { findItems } = createFindItemsAdapter({ findItems: mockConsumerFindItems });

        const result = await findItems({
          ...defaultFindParams,
          sort: { field: 'createdAt', direction: 'asc' },
        });

        // Item with null createdAt should be pushed to end in ascending sort.
        expect(result.items[1].attributes.title).toBe('No date');
      });

      it('sorts by custom attribute with string values', async () => {
        const mockConsumerFindItems = jest.fn().mockResolvedValue({
          total: 2,
          hits: [
            {
              ...createMockItem('1', 'Item 1'),
              attributes: { title: 'Item 1', status: 'published' },
            },
            {
              ...createMockItem('2', 'Item 2'),
              attributes: { title: 'Item 2', status: 'draft' },
            },
          ],
        });

        const { findItems } = createFindItemsAdapter({ findItems: mockConsumerFindItems });

        const result = await findItems({
          ...defaultFindParams,
          sort: { field: 'status', direction: 'asc' },
        });

        // 'draft' comes before 'published' alphabetically.
        expect(result.items[0].id).toBe('2');
        expect(result.items[1].id).toBe('1');
      });

      it('sorts by custom attribute with numeric values', async () => {
        const mockConsumerFindItems = jest.fn().mockResolvedValue({
          total: 3,
          hits: [
            {
              ...createMockItem('1', 'Item 1'),
              attributes: { title: 'Item 1', priority: 10 },
            },
            {
              ...createMockItem('2', 'Item 2'),
              attributes: { title: 'Item 2', priority: 5 },
            },
            {
              ...createMockItem('3', 'Item 3'),
              attributes: { title: 'Item 3', priority: 15 },
            },
          ],
        });

        const { findItems } = createFindItemsAdapter({ findItems: mockConsumerFindItems });

        const resultAsc = await findItems({
          ...defaultFindParams,
          sort: { field: 'priority', direction: 'asc' },
        });

        expect(resultAsc.items.map((i) => i.id)).toEqual(['2', '1', '3']);

        const resultDesc = await findItems({
          ...defaultFindParams,
          sort: { field: 'priority', direction: 'desc' },
        });

        expect(resultDesc.items.map((i) => i.id)).toEqual(['3', '1', '2']);
      });

      it('handles equal values in sorting (maintains order)', async () => {
        const mockConsumerFindItems = jest.fn().mockResolvedValue({
          total: 2,
          hits: [createMockItem('1', 'Same Title'), createMockItem('2', 'Same Title')],
        });

        const { findItems } = createFindItemsAdapter({ findItems: mockConsumerFindItems });

        const result = await findItems({
          ...defaultFindParams,
          sort: { field: 'title', direction: 'asc' },
        });

        expect(result.items.map((i) => i.id)).toEqual(['1', '2']);
      });
    });

    describe('client-side pagination', () => {
      it('applies pagination to results', async () => {
        const mockConsumerFindItems = jest.fn().mockResolvedValue({
          total: 5,
          hits: [
            createMockItem('1', 'Item 1', { updatedAt: '2024-01-01T00:00:00Z' }),
            createMockItem('2', 'Item 2', { updatedAt: '2024-01-02T00:00:00Z' }),
            createMockItem('3', 'Item 3', { updatedAt: '2024-01-03T00:00:00Z' }),
            createMockItem('4', 'Item 4', { updatedAt: '2024-01-04T00:00:00Z' }),
            createMockItem('5', 'Item 5', { updatedAt: '2024-01-05T00:00:00Z' }),
          ],
        });

        const { findItems } = createFindItemsAdapter({ findItems: mockConsumerFindItems });

        // Get second page with 2 items per page.
        const result = await findItems({
          ...defaultFindParams,
          sort: { field: 'updatedAt', direction: 'asc' },
          page: { index: 1, size: 2 },
        });

        expect(result.items).toHaveLength(2);
        expect(result.items.map((i) => i.id)).toEqual(['3', '4']);
        expect(result.total).toBe(5);
      });

      it('returns empty array for page beyond results', async () => {
        const mockConsumerFindItems = jest.fn().mockResolvedValue({
          total: 2,
          hits: [createMockItem('1', 'Item 1'), createMockItem('2', 'Item 2')],
        });

        const { findItems } = createFindItemsAdapter({ findItems: mockConsumerFindItems });

        const result = await findItems({
          ...defaultFindParams,
          page: { index: 5, size: 10 },
        });

        expect(result.items).toHaveLength(0);
        expect(result.total).toBe(2);
      });
    });

    describe('error handling', () => {
      it('returns empty result on AbortError without logging', async () => {
        const abortError = new Error('Aborted');
        abortError.name = 'AbortError';
        const mockConsumerFindItems = jest.fn().mockRejectedValue(abortError);

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        const { findItems } = createFindItemsAdapter({ findItems: mockConsumerFindItems });

        const result = await findItems(defaultFindParams);

        expect(result).toEqual({ items: [], total: 0 });
        expect(consoleSpy).not.toHaveBeenCalled();

        consoleSpy.mockRestore();
      });

      it('returns empty result and logs other errors', async () => {
        const mockConsumerFindItems = jest.fn().mockRejectedValue(new Error('Network error'));

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        const { findItems } = createFindItemsAdapter({ findItems: mockConsumerFindItems });

        const result = await findItems(defaultFindParams);

        expect(result).toEqual({ items: [], total: 0 });
        expect(consoleSpy).toHaveBeenCalledWith('Error in findItems adapter:', expect.any(Error));

        consoleSpy.mockRestore();
      });
    });

    describe('combined operations', () => {
      it('applies user filter, then sorts, then paginates', async () => {
        const mockConsumerFindItems = jest.fn().mockResolvedValue({
          total: 5,
          hits: [
            createMockItem('1', 'Alpha', { createdBy: 'user-1' }),
            createMockItem('2', 'Beta', { createdBy: 'user-2' }),
            createMockItem('3', 'Gamma', { createdBy: 'user-1' }),
            createMockItem('4', 'Delta', { createdBy: 'user-1' }),
            createMockItem('5', 'Epsilon', { createdBy: 'user-2' }),
          ],
        });

        const { findItems } = createFindItemsAdapter({ findItems: mockConsumerFindItems });

        // Filter to user-1 (items 1, 3, 4), sort by title asc (Alpha, Delta, Gamma),
        // then get page 1 with size 2 (Delta, Gamma).
        const result = await findItems({
          ...defaultFindParams,
          filters: {
            tags: { include: [], exclude: [] },
            users: ['user-1'],
          },
          sort: { field: 'title', direction: 'asc' },
          page: { index: 1, size: 1 },
        });

        expect(result.items).toHaveLength(1);
        expect(result.items[0].attributes.title).toBe('Delta');
        expect(result.total).toBe(3); // Total after user filter.
      });
    });

    describe('username resolution', () => {
      const mockBulkGetUserProfiles = jest.fn();

      beforeEach(() => {
        mockBulkGetUserProfiles.mockReset();
      });

      it('resolves username to UID when filtering by username', async () => {
        const mockConsumerFindItems = jest.fn().mockResolvedValue({
          total: 3,
          hits: [
            createMockItem('1', 'Dashboard 1', { createdBy: 'u_user1_abc123' }),
            createMockItem('2', 'Dashboard 2', { createdBy: 'u_user2_def456' }),
            createMockItem('3', 'Dashboard 3', { createdBy: 'u_user1_abc123' }),
          ],
        });

        mockBulkGetUserProfiles.mockResolvedValue([
          { uid: 'u_user1_abc123', user: { username: 'elastic', email: 'elastic@test.com' } },
          { uid: 'u_user2_def456', user: { username: 'admin', email: 'admin@test.com' } },
        ]);

        const { findItems } = createFindItemsAdapter({
          findItems: mockConsumerFindItems,
          bulkGetUserProfiles: mockBulkGetUserProfiles,
        });

        // Filter by username "elastic" - should resolve to UID and match items 1 and 3.
        const result = await findItems({
          ...defaultFindParams,
          filters: {
            tags: { include: [], exclude: [] },
            users: ['elastic'],
          },
        });

        expect(result.items).toHaveLength(2);
        expect(result.items.map((i) => i.id).sort()).toEqual(['1', '3']);
        expect(result.total).toBe(2);
      });

      it('resolves email to UID when filtering by email', async () => {
        const mockConsumerFindItems = jest.fn().mockResolvedValue({
          total: 2,
          hits: [
            createMockItem('1', 'Dashboard 1', { createdBy: 'u_user1_abc123' }),
            createMockItem('2', 'Dashboard 2', { createdBy: 'u_user2_def456' }),
          ],
        });

        mockBulkGetUserProfiles.mockResolvedValue([
          { uid: 'u_user1_abc123', user: { username: 'elastic', email: 'elastic@test.com' } },
          { uid: 'u_user2_def456', user: { username: 'admin', email: 'admin@test.com' } },
        ]);

        const { findItems } = createFindItemsAdapter({
          findItems: mockConsumerFindItems,
          bulkGetUserProfiles: mockBulkGetUserProfiles,
        });

        // Filter by email.
        const result = await findItems({
          ...defaultFindParams,
          filters: {
            tags: { include: [], exclude: [] },
            users: ['admin@test.com'],
          },
        });

        expect(result.items).toHaveLength(1);
        expect(result.items[0].id).toBe('2');
      });

      it('handles case-insensitive username matching', async () => {
        const mockConsumerFindItems = jest.fn().mockResolvedValue({
          total: 1,
          hits: [createMockItem('1', 'Dashboard 1', { createdBy: 'u_user1_abc123' })],
        });

        mockBulkGetUserProfiles.mockResolvedValue([
          { uid: 'u_user1_abc123', user: { username: 'Elastic', email: 'elastic@test.com' } },
        ]);

        const { findItems } = createFindItemsAdapter({
          findItems: mockConsumerFindItems,
          bulkGetUserProfiles: mockBulkGetUserProfiles,
        });

        // Filter with lowercase - should match uppercase username.
        const result = await findItems({
          ...defaultFindParams,
          filters: {
            tags: { include: [], exclude: [] },
            users: ['elastic'], // Lowercase.
          },
        });

        expect(result.items).toHaveLength(1);
      });

      it('returns no results when username is not resolvable', async () => {
        const mockConsumerFindItems = jest.fn().mockResolvedValue({
          total: 2,
          hits: [
            createMockItem('1', 'Dashboard 1', { createdBy: 'u_user1_abc123' }),
            createMockItem('2', 'Dashboard 2', { createdBy: 'u_user2_def456' }),
          ],
        });

        mockBulkGetUserProfiles.mockResolvedValue([
          { uid: 'u_user1_abc123', user: { username: 'elastic' } },
          { uid: 'u_user2_def456', user: { username: 'admin' } },
        ]);

        const { findItems } = createFindItemsAdapter({
          findItems: mockConsumerFindItems,
          bulkGetUserProfiles: mockBulkGetUserProfiles,
        });

        // Filter by unknown username.
        const result = await findItems({
          ...defaultFindParams,
          filters: {
            tags: { include: [], exclude: [] },
            users: ['unknownUser'],
          },
        });

        expect(result.items).toHaveLength(0);
        expect(result.total).toBe(0);
      });

      it('still works with direct UID filter when lookup is available', async () => {
        const mockConsumerFindItems = jest.fn().mockResolvedValue({
          total: 2,
          hits: [
            createMockItem('1', 'Dashboard 1', { createdBy: 'u_user1_abc123' }),
            createMockItem('2', 'Dashboard 2', { createdBy: 'u_user2_def456' }),
          ],
        });

        mockBulkGetUserProfiles.mockResolvedValue([
          { uid: 'u_user1_abc123', user: { username: 'elastic' } },
          { uid: 'u_user2_def456', user: { username: 'admin' } },
        ]);

        const { findItems } = createFindItemsAdapter({
          findItems: mockConsumerFindItems,
          bulkGetUserProfiles: mockBulkGetUserProfiles,
        });

        // Filter by UID directly - should still work.
        const result = await findItems({
          ...defaultFindParams,
          filters: {
            tags: { include: [], exclude: [] },
            users: ['u_user1_abc123'],
          },
        });

        expect(result.items).toHaveLength(1);
        expect(result.items[0].id).toBe('1');
      });

      it('falls back to direct comparison when bulkGetUserProfiles is not provided', async () => {
        const mockConsumerFindItems = jest.fn().mockResolvedValue({
          total: 2,
          hits: [
            createMockItem('1', 'Dashboard 1', { createdBy: 'user-1' }),
            createMockItem('2', 'Dashboard 2', { createdBy: 'user-2' }),
          ],
        });

        // No bulkGetUserProfiles provided.
        const { findItems } = createFindItemsAdapter({
          findItems: mockConsumerFindItems,
        });

        // Filter by createdBy value directly - should work via direct comparison.
        const result = await findItems({
          ...defaultFindParams,
          filters: {
            tags: { include: [], exclude: [] },
            users: ['user-1'],
          },
        });

        expect(result.items).toHaveLength(1);
        expect(result.items[0].id).toBe('1');
      });

      it('caches user lookup map with items', async () => {
        const mockConsumerFindItems = jest.fn().mockResolvedValue({
          total: 2,
          hits: [
            createMockItem('1', 'Dashboard 1', { createdBy: 'u_user1_abc123' }),
            createMockItem('2', 'Dashboard 2', { createdBy: 'u_user2_def456' }),
          ],
        });

        mockBulkGetUserProfiles.mockResolvedValue([
          { uid: 'u_user1_abc123', user: { username: 'elastic' } },
          { uid: 'u_user2_def456', user: { username: 'admin' } },
        ]);

        const { findItems } = createFindItemsAdapter({
          findItems: mockConsumerFindItems,
          bulkGetUserProfiles: mockBulkGetUserProfiles,
        });

        // First call - fetches items and profiles.
        await findItems(defaultFindParams);

        expect(mockBulkGetUserProfiles).toHaveBeenCalledTimes(1);

        // Second call with user filter - should use cached lookup map.
        await findItems({
          ...defaultFindParams,
          filters: {
            tags: { include: [], exclude: [] },
            users: ['elastic'],
          },
        });

        // Should not call bulkGetUserProfiles again.
        expect(mockBulkGetUserProfiles).toHaveBeenCalledTimes(1);
      });

      it('continues with empty lookup map when bulkGetUserProfiles fails', async () => {
        const mockConsumerFindItems = jest.fn().mockResolvedValue({
          total: 2,
          hits: [
            createMockItem('1', 'Dashboard 1', { createdBy: 'user-1' }),
            createMockItem('2', 'Dashboard 2', { createdBy: 'user-2' }),
          ],
        });

        mockBulkGetUserProfiles.mockRejectedValue(new Error('Profile fetch failed'));

        const { findItems } = createFindItemsAdapter({
          findItems: mockConsumerFindItems,
          bulkGetUserProfiles: mockBulkGetUserProfiles,
        });

        // Filter by direct UID - should fall back to direct comparison.
        const result = await findItems({
          ...defaultFindParams,
          filters: {
            tags: { include: [], exclude: [] },
            users: ['user-1'],
          },
        });

        expect(result.items).toHaveLength(1);
        expect(result.items[0].id).toBe('1');
      });

      it('filters for items without creator when "no-user" is in filter', async () => {
        const mockConsumerFindItems = jest.fn().mockResolvedValue({
          total: 3,
          hits: [
            createMockItem('1', 'Has creator', { createdBy: 'u_user1_abc123' }),
            createMockItem('2', 'No creator', { createdBy: undefined }),
            createMockItem('3', 'Managed item', { createdBy: undefined, managed: true }),
          ],
        });

        mockBulkGetUserProfiles.mockResolvedValue([
          { uid: 'u_user1_abc123', user: { username: 'elastic' } },
        ]);

        const { findItems } = createFindItemsAdapter({
          findItems: mockConsumerFindItems,
          bulkGetUserProfiles: mockBulkGetUserProfiles,
        });

        // Filter by "no-user" - should match items without createdBy (excluding managed).
        const result = await findItems({
          ...defaultFindParams,
          filters: {
            tags: { include: [], exclude: [] },
            users: ['no-user'],
          },
        });

        expect(result.items).toHaveLength(1);
        expect(result.items[0].id).toBe('2');
        expect(result.items[0].attributes.title).toBe('No creator');
      });

      it('combines "no-user" filter with regular user filter', async () => {
        const mockConsumerFindItems = jest.fn().mockResolvedValue({
          total: 4,
          hits: [
            createMockItem('1', 'By elastic', { createdBy: 'u_user1_abc123' }),
            createMockItem('2', 'By admin', { createdBy: 'u_user2_def456' }),
            createMockItem('3', 'No creator', { createdBy: undefined }),
            createMockItem('4', 'Managed', { createdBy: undefined, managed: true }),
          ],
        });

        mockBulkGetUserProfiles.mockResolvedValue([
          { uid: 'u_user1_abc123', user: { username: 'elastic' } },
          { uid: 'u_user2_def456', user: { username: 'admin' } },
        ]);

        const { findItems } = createFindItemsAdapter({
          findItems: mockConsumerFindItems,
          bulkGetUserProfiles: mockBulkGetUserProfiles,
        });

        // Filter by "elastic" and "no-user" - should match both.
        const result = await findItems({
          ...defaultFindParams,
          filters: {
            tags: { include: [], exclude: [] },
            users: ['elastic', 'no-user'],
          },
        });

        expect(result.items).toHaveLength(2);
        expect(result.items.map((i) => i.id).sort()).toEqual(['1', '3']);
      });

      it('handles "no-user" filter without bulkGetUserProfiles', async () => {
        const mockConsumerFindItems = jest.fn().mockResolvedValue({
          total: 2,
          hits: [
            createMockItem('1', 'Has creator', { createdBy: 'user-1' }),
            createMockItem('2', 'No creator', { createdBy: undefined }),
          ],
        });

        // No bulkGetUserProfiles provided.
        const { findItems } = createFindItemsAdapter({
          findItems: mockConsumerFindItems,
        });

        const result = await findItems({
          ...defaultFindParams,
          filters: {
            tags: { include: [], exclude: [] },
            users: ['no-user'],
          },
        });

        expect(result.items).toHaveLength(1);
        expect(result.items[0].id).toBe('2');
      });
    });

    describe('starred/favorites filtering', () => {
      // Note: The adapter no longer filters by starred. It returns ALL items when
      // starredOnly is true (without pagination), and the state provider filters
      // reactively using favoritesData from React Query. This enables automatic
      // updates when favorites change without manual refetch.

      it('returns all items without pagination when starredOnly is true', async () => {
        const mockConsumerFindItems = jest.fn().mockResolvedValue({
          total: 4,
          hits: [
            createMockItem('1', 'Item 1'),
            createMockItem('2', 'Item 2'),
            createMockItem('3', 'Item 3'),
            createMockItem('4', 'Item 4'),
          ],
        });

        const { findItems } = createFindItemsAdapter({
          findItems: mockConsumerFindItems,
        });

        // Request with starredOnly and small page size.
        const result = await findItems({
          ...defaultFindParams,
          page: { index: 0, size: 2 },
          filters: {
            tags: { include: [], exclude: [] },
            starredOnly: true,
          },
        });

        // Should return ALL items (no pagination) so state provider can filter reactively.
        expect(result.items).toHaveLength(4);
        expect(result.total).toBe(4);
      });

      it('returns paginated items when starredOnly is false', async () => {
        const mockConsumerFindItems = jest.fn().mockResolvedValue({
          total: 4,
          hits: [
            createMockItem('1', 'Item 1'),
            createMockItem('2', 'Item 2'),
            createMockItem('3', 'Item 3'),
            createMockItem('4', 'Item 4'),
          ],
        });

        const { findItems } = createFindItemsAdapter({
          findItems: mockConsumerFindItems,
        });

        const result = await findItems({
          ...defaultFindParams,
          page: { index: 0, size: 2 },
          filters: {
            tags: { include: [], exclude: [] },
            starredOnly: false,
          },
        });

        // Should return paginated items.
        expect(result.items).toHaveLength(2);
        expect(result.total).toBe(4);
      });

      it('still applies sorting when starredOnly is true', async () => {
        const mockConsumerFindItems = jest.fn().mockResolvedValue({
          total: 3,
          hits: [
            createMockItem('1', 'Zebra'),
            createMockItem('2', 'Apple'),
            createMockItem('3', 'Mango'),
          ],
        });

        const { findItems } = createFindItemsAdapter({
          findItems: mockConsumerFindItems,
        });

        const result = await findItems({
          ...defaultFindParams,
          sort: { field: 'title', direction: 'asc' },
          filters: {
            tags: { include: [], exclude: [] },
            starredOnly: true,
          },
        });

        // Items should be sorted even when starredOnly is true.
        expect(result.items[0].attributes.title).toBe('Apple');
        expect(result.items[1].attributes.title).toBe('Mango');
        expect(result.items[2].attributes.title).toBe('Zebra');
      });
    });

    describe('caching behavior', () => {
      it('does not re-fetch when only sort changes', async () => {
        const mockConsumerFindItems = jest.fn().mockResolvedValue({
          total: 3,
          hits: [
            createMockItem('1', 'Zebra'),
            createMockItem('2', 'Apple'),
            createMockItem('3', 'Mango'),
          ],
        });

        const { findItems } = createFindItemsAdapter({ findItems: mockConsumerFindItems });

        // First call - fetches from consumer.
        await findItems({
          ...defaultFindParams,
          sort: { field: 'title', direction: 'asc' },
        });

        expect(mockConsumerFindItems).toHaveBeenCalledTimes(1);

        // Second call with different sort - should use cache.
        const result = await findItems({
          ...defaultFindParams,
          sort: { field: 'title', direction: 'desc' },
        });

        expect(mockConsumerFindItems).toHaveBeenCalledTimes(1); // Still 1.
        expect(result.items.map((i) => i.attributes.title)).toEqual(['Zebra', 'Mango', 'Apple']);
      });

      it('does not re-fetch when only page changes', async () => {
        const mockConsumerFindItems = jest.fn().mockResolvedValue({
          total: 5,
          hits: [
            createMockItem('1', 'Item 1', { updatedAt: '2024-01-01T00:00:00Z' }),
            createMockItem('2', 'Item 2', { updatedAt: '2024-01-02T00:00:00Z' }),
            createMockItem('3', 'Item 3', { updatedAt: '2024-01-03T00:00:00Z' }),
            createMockItem('4', 'Item 4', { updatedAt: '2024-01-04T00:00:00Z' }),
            createMockItem('5', 'Item 5', { updatedAt: '2024-01-05T00:00:00Z' }),
          ],
        });

        const { findItems } = createFindItemsAdapter({ findItems: mockConsumerFindItems });

        // First call - page 0.
        await findItems({
          ...defaultFindParams,
          sort: { field: 'updatedAt', direction: 'asc' },
          page: { index: 0, size: 2 },
        });

        expect(mockConsumerFindItems).toHaveBeenCalledTimes(1);

        // Second call - page 1 - should use cache.
        const result = await findItems({
          ...defaultFindParams,
          sort: { field: 'updatedAt', direction: 'asc' },
          page: { index: 1, size: 2 },
        });

        expect(mockConsumerFindItems).toHaveBeenCalledTimes(1); // Still 1.
        expect(result.items.map((i) => i.id)).toEqual(['3', '4']);
      });

      it('does not re-fetch when only user filter changes', async () => {
        const mockConsumerFindItems = jest.fn().mockResolvedValue({
          total: 3,
          hits: [
            createMockItem('1', 'Item 1', { createdBy: 'user-1' }),
            createMockItem('2', 'Item 2', { createdBy: 'user-2' }),
            createMockItem('3', 'Item 3', { createdBy: 'user-1' }),
          ],
        });

        const { findItems } = createFindItemsAdapter({ findItems: mockConsumerFindItems });

        // First call - no user filter.
        await findItems(defaultFindParams);

        expect(mockConsumerFindItems).toHaveBeenCalledTimes(1);

        // Second call - with user filter - should use cache (user filter is client-side).
        const result = await findItems({
          ...defaultFindParams,
          filters: {
            tags: { include: [], exclude: [] },
            users: ['user-1'],
          },
        });

        expect(mockConsumerFindItems).toHaveBeenCalledTimes(1); // Still 1.
        expect(result.items).toHaveLength(2);
        expect(result.total).toBe(2);
      });

      it('re-fetches when searchQuery changes', async () => {
        const mockConsumerFindItems = jest.fn().mockResolvedValue({
          total: 2,
          hits: [createMockItem('1', 'Item 1'), createMockItem('2', 'Item 2')],
        });

        const { findItems } = createFindItemsAdapter({ findItems: mockConsumerFindItems });

        // First call.
        await findItems({
          ...defaultFindParams,
          searchQuery: 'first query',
        });

        expect(mockConsumerFindItems).toHaveBeenCalledTimes(1);

        // Second call with different search - should re-fetch.
        await findItems({
          ...defaultFindParams,
          searchQuery: 'second query',
        });

        expect(mockConsumerFindItems).toHaveBeenCalledTimes(2);
      });

      it('re-fetches when tag include filter changes', async () => {
        const mockConsumerFindItems = jest.fn().mockResolvedValue({
          total: 2,
          hits: [createMockItem('1', 'Item 1'), createMockItem('2', 'Item 2')],
        });

        const { findItems } = createFindItemsAdapter({ findItems: mockConsumerFindItems });

        // First call - no tags.
        await findItems(defaultFindParams);

        expect(mockConsumerFindItems).toHaveBeenCalledTimes(1);

        // Second call with tag filter - should re-fetch.
        await findItems({
          ...defaultFindParams,
          filters: {
            tags: { include: ['tag-1'], exclude: [] },
          },
        });

        expect(mockConsumerFindItems).toHaveBeenCalledTimes(2);
      });

      it('re-fetches when tag exclude filter changes', async () => {
        const mockConsumerFindItems = jest.fn().mockResolvedValue({
          total: 2,
          hits: [createMockItem('1', 'Item 1'), createMockItem('2', 'Item 2')],
        });

        const { findItems } = createFindItemsAdapter({ findItems: mockConsumerFindItems });

        // First call - no tags.
        await findItems(defaultFindParams);

        expect(mockConsumerFindItems).toHaveBeenCalledTimes(1);

        // Second call with tag exclude filter - should re-fetch.
        await findItems({
          ...defaultFindParams,
          filters: {
            tags: { include: [], exclude: ['tag-1'] },
          },
        });

        expect(mockConsumerFindItems).toHaveBeenCalledTimes(2);
      });

      it('uses same cache regardless of tag order', async () => {
        const mockConsumerFindItems = jest.fn().mockResolvedValue({
          total: 2,
          hits: [createMockItem('1', 'Item 1'), createMockItem('2', 'Item 2')],
        });

        const { findItems } = createFindItemsAdapter({ findItems: mockConsumerFindItems });

        // First call with tags in one order.
        await findItems({
          ...defaultFindParams,
          filters: {
            tags: { include: ['tag-1', 'tag-2'], exclude: [] },
          },
        });

        expect(mockConsumerFindItems).toHaveBeenCalledTimes(1);

        // Second call with same tags in different order - should use cache.
        await findItems({
          ...defaultFindParams,
          filters: {
            tags: { include: ['tag-2', 'tag-1'], exclude: [] },
          },
        });

        expect(mockConsumerFindItems).toHaveBeenCalledTimes(1); // Still 1.
      });

      it('clears cache on error and re-fetches next time', async () => {
        const mockConsumerFindItems = jest
          .fn()
          .mockRejectedValueOnce(new Error('Network error'))
          .mockResolvedValue({
            total: 2,
            hits: [createMockItem('1', 'Item 1'), createMockItem('2', 'Item 2')],
          });

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        const { findItems } = createFindItemsAdapter({ findItems: mockConsumerFindItems });

        // First call - fails.
        await findItems(defaultFindParams);

        expect(mockConsumerFindItems).toHaveBeenCalledTimes(1);

        // Second call - should retry since first failed.
        const result = await findItems(defaultFindParams);

        expect(mockConsumerFindItems).toHaveBeenCalledTimes(2);
        expect(result.items).toHaveLength(2);

        consoleSpy.mockRestore();
      });

      it('clearCache forces re-fetch on next call', async () => {
        const mockConsumerFindItems = jest.fn().mockResolvedValue({
          total: 2,
          hits: [createMockItem('1', 'Item 1'), createMockItem('2', 'Item 2')],
        });

        const { findItems, clearCache } = createFindItemsAdapter({
          findItems: mockConsumerFindItems,
        });

        // First call - fetches from consumer.
        await findItems(defaultFindParams);
        expect(mockConsumerFindItems).toHaveBeenCalledTimes(1);

        // Second call - should use cache.
        await findItems(defaultFindParams);
        expect(mockConsumerFindItems).toHaveBeenCalledTimes(1); // Still 1.

        // Clear the cache.
        clearCache();

        // Third call - should re-fetch since cache was cleared.
        await findItems(defaultFindParams);
        expect(mockConsumerFindItems).toHaveBeenCalledTimes(2);
      });
    });
  });
});
