/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useContentListItemsQuery, contentListKeys } from './queries';
import type { DataSourceConfig, FindItemsParams } from '../datasource';
import {
  createMockItems,
  createMockFindItems,
  identityTransform,
  flushPromises,
} from '../test_utils';

describe('useContentListItemsQuery', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          cacheTime: 0,
          staleTime: 0,
        },
      },
      logger: {
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('basic functionality', () => {
    it('should fetch and return items', async () => {
      const mockItems = createMockItems(5);
      const mockFindItems = jest.fn(createMockFindItems(mockItems));
      const dataSource = {
        findItems: mockFindItems,
        transform: identityTransform,
      };

      const { result } = renderHook(
        () =>
          useContentListItemsQuery({
            dataSource,
            entityName: 'test',
            searchQueryText: '',
            filters: {},
            sort: { field: 'title', direction: 'asc' },
            page: { index: 0, size: 10 },
          }),
        { wrapper }
      );

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.items).toHaveLength(5);
      expect(result.current.data?.total).toBe(5);
      expect(mockFindItems).toHaveBeenCalledTimes(1);
    });

    it('should apply search query filter', async () => {
      const mockItems = createMockItems(10);
      const mockFindItems = jest.fn(createMockFindItems(mockItems));
      const dataSource = {
        findItems: mockFindItems,
        transform: identityTransform,
      };

      const { result } = renderHook(
        () =>
          useContentListItemsQuery({
            dataSource,
            entityName: 'test',
            searchQueryText: 'Item 1',
            filters: {},
            sort: { field: 'title', direction: 'asc' },
            page: { index: 0, size: 10 },
          }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const callArgs = mockFindItems.mock.calls[0][0] as FindItemsParams;
      expect(callArgs.searchQuery).toBe('Item 1');
    });

    it('should apply tag filters', async () => {
      const mockItems = createMockItems(10);
      const mockFindItems = jest.fn(createMockFindItems(mockItems));
      const dataSource = {
        findItems: mockFindItems,
        transform: identityTransform,
      };

      const { result } = renderHook(
        () =>
          useContentListItemsQuery({
            dataSource,
            entityName: 'test',
            searchQueryText: '',
            filters: {
              tags: {
                include: ['tag-1'],
                exclude: [],
              },
            },
            sort: { field: 'title', direction: 'asc' },
            page: { index: 0, size: 10 },
          }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const callArgs = mockFindItems.mock.calls[0][0] as FindItemsParams;
      expect(callArgs.filters.tags?.include).toEqual(['tag-1']);
    });

    it('should apply sort configuration', async () => {
      const mockItems = createMockItems(10);
      const mockFindItems = jest.fn(createMockFindItems(mockItems));
      const dataSource = {
        findItems: mockFindItems,
        transform: identityTransform,
      };

      const { result } = renderHook(
        () =>
          useContentListItemsQuery({
            dataSource,
            entityName: 'test',
            searchQueryText: '',
            filters: {},
            sort: { field: 'updatedAt', direction: 'desc' },
            page: { index: 0, size: 10 },
          }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const callArgs = mockFindItems.mock.calls[0][0] as FindItemsParams;
      expect(callArgs.sort).toEqual({ field: 'updatedAt', direction: 'desc' });
    });

    it('should apply pagination', async () => {
      const mockItems = createMockItems(20);
      const mockFindItems = jest.fn(createMockFindItems(mockItems));
      const dataSource = {
        findItems: mockFindItems,
        transform: identityTransform,
      };

      const { result } = renderHook(
        () =>
          useContentListItemsQuery({
            dataSource,
            entityName: 'test',
            searchQueryText: '',
            filters: {},
            sort: { field: 'title', direction: 'asc' },
            page: { index: 1, size: 5 },
          }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const callArgs = mockFindItems.mock.calls[0][0] as FindItemsParams;
      expect(callArgs.page).toEqual({ index: 1, size: 5 });
    });
  });

  describe('tagList integration', () => {
    it('should use tagList to extract tags from query text', async () => {
      const mockItems = createMockItems(10);
      const mockFindItems = jest.fn(createMockFindItems(mockItems));
      const tagList = [
        { id: 'tag-1', name: 'Important' },
        { id: 'tag-2', name: 'Urgent' },
      ];

      const dataSource = {
        findItems: mockFindItems,
        transform: identityTransform,
      };

      const { result } = renderHook(
        () =>
          useContentListItemsQuery({
            dataSource,
            entityName: 'test',
            searchQueryText: 'tag:Important tag:Urgent test',
            filters: {},
            sort: { field: 'title', direction: 'asc' },
            page: { index: 0, size: 10 },
            tagList,
          }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const callArgs = mockFindItems.mock.calls[0][0] as FindItemsParams;
      expect(callArgs.searchQuery).toBe('test');
      expect(callArgs.filters.tags?.include).toEqual(['tag-1', 'tag-2']);
    });

    it('should handle tag exclusion from query text', async () => {
      const mockItems = createMockItems(10);
      const mockFindItems = jest.fn(createMockFindItems(mockItems));
      const tagList = [{ id: 'tag-archived', name: 'Archived' }];

      const dataSource = {
        findItems: mockFindItems,
        transform: identityTransform,
      };

      const { result } = renderHook(
        () =>
          useContentListItemsQuery({
            dataSource,
            entityName: 'test',
            searchQueryText: '-tag:Archived',
            filters: {},
            sort: { field: 'title', direction: 'asc' },
            page: { index: 0, size: 10 },
            tagList,
          }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const callArgs = mockFindItems.mock.calls[0][0] as FindItemsParams;
      expect(callArgs.filters.tags?.exclude).toEqual(['tag-archived']);
    });

    it('should merge parsed tags with existing filters', async () => {
      const mockItems = createMockItems(10);
      const mockFindItems = jest.fn(createMockFindItems(mockItems));
      const tagList = [{ id: 'tag-1', name: 'Important' }];

      const dataSource = {
        findItems: mockFindItems,
        transform: identityTransform,
      };

      const { result } = renderHook(
        () =>
          useContentListItemsQuery({
            dataSource,
            entityName: 'test',
            searchQueryText: 'tag:Important',
            filters: {
              tags: {
                include: ['tag-existing'],
                exclude: [],
              },
            },
            sort: { field: 'title', direction: 'asc' },
            page: { index: 0, size: 10 },
            tagList,
          }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Parsed tags should override existing filters.
      const callArgs = mockFindItems.mock.calls[0][0] as FindItemsParams;
      expect(callArgs.filters.tags?.include).toEqual(['tag-1']);
    });
  });

  describe('query parsing from text', () => {
    it('should extract is:starred from query text', async () => {
      const mockItems = createMockItems(10);
      const mockFindItems = jest.fn(createMockFindItems(mockItems));
      const dataSource = {
        findItems: mockFindItems,
        transform: identityTransform,
      };

      const { result } = renderHook(
        () =>
          useContentListItemsQuery({
            dataSource,
            entityName: 'test',
            searchQueryText: 'is:starred test query',
            filters: {},
            sort: { field: 'title', direction: 'asc' },
            page: { index: 0, size: 10 },
          }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const callArgs = mockFindItems.mock.calls[0][0] as FindItemsParams;
      expect(callArgs.filters.starredOnly).toBe(true);
      // Clean query should not include is:starred.
      expect(callArgs.searchQuery).not.toContain('is:starred');
    });

    it('should extract createdBy from query text', async () => {
      const mockItems = createMockItems(10);
      const mockFindItems = jest.fn(createMockFindItems(mockItems));
      const dataSource = {
        findItems: mockFindItems,
        transform: identityTransform,
      };

      const { result } = renderHook(
        () =>
          useContentListItemsQuery({
            dataSource,
            entityName: 'test',
            searchQueryText: 'createdBy:user-1 test',
            filters: {},
            sort: { field: 'title', direction: 'asc' },
            page: { index: 0, size: 10 },
          }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const callArgs = mockFindItems.mock.calls[0][0] as FindItemsParams;
      expect(callArgs.filters.users).toEqual(['user-1']);
      expect(callArgs.searchQuery).not.toContain('createdBy:user-1');
    });

    it('should extract custom filters from query text', async () => {
      const mockItems = createMockItems(10);
      const mockFindItems = jest.fn(createMockFindItems(mockItems));
      const dataSource = {
        findItems: mockFindItems,
        transform: identityTransform,
      };

      const { result } = renderHook(
        () =>
          useContentListItemsQuery({
            dataSource,
            entityName: 'test',
            searchQueryText: 'status:active test query',
            filters: {},
            sort: { field: 'title', direction: 'asc' },
            page: { index: 0, size: 10 },
            filteringConfig: {
              custom: {
                status: {
                  name: 'Status',
                  options: [
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                  ],
                },
              },
            },
          }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const callArgs = mockFindItems.mock.calls[0][0] as FindItemsParams;
      expect(callArgs.filters.status).toEqual(['active']);
      expect(callArgs.searchQuery).not.toContain('status:active');
    });
  });

  describe('transform function', () => {
    it('should apply transform to items', async () => {
      const rawItems = [
        {
          id: '1',
          type: 'test',
          attributes: { title: 'Raw Title' },
          updatedAt: '2024-01-01',
          createdAt: '2024-01-01',
          updatedBy: 'user-1',
          createdBy: 'user-1',
          references: [],
        },
      ];

      const mockFindItems = jest.fn(async () => ({
        items: rawItems,
        total: 1,
      }));

      const transform = jest.fn((item) => ({
        id: item.id,
        title: item.attributes.title,
        type: item.type,
        updatedAt: new Date(item.updatedAt),
        createdAt: new Date(item.createdAt),
        updatedBy: item.updatedBy,
        createdBy: item.createdBy,
        tags: [],
        references: [],
      }));

      const dataSource: DataSourceConfig<(typeof rawItems)[0]> = {
        findItems: mockFindItems,
        transform,
      };

      const { result } = renderHook(
        () =>
          useContentListItemsQuery({
            dataSource,
            entityName: 'test',
            searchQueryText: '',
            filters: {},
            sort: { field: 'title', direction: 'asc' },
            page: { index: 0, size: 10 },
          }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(transform).toHaveBeenCalledTimes(1);
      expect(result.current.data?.items[0].title).toBe('Raw Title');
    });

    it('should use defaultTransform when transform is not provided', async () => {
      // Use UserContentCommonSchema items for defaultTransform test.
      const rawItems = [
        {
          id: '1',
          type: 'test',
          attributes: { title: 'Test Item 1', description: 'Description 1' },
          updatedAt: '2024-01-01T00:00:00Z',
          createdAt: '2024-01-01T00:00:00Z',
          updatedBy: 'user-1',
          createdBy: 'user-1',
          references: [],
          managed: false,
        },
        {
          id: '2',
          type: 'test',
          attributes: { title: 'Test Item 2', description: 'Description 2' },
          updatedAt: '2024-01-02T00:00:00Z',
          createdAt: '2024-01-01T00:00:00Z',
          updatedBy: 'user-1',
          createdBy: 'user-1',
          references: [],
          managed: false,
        },
      ];

      const mockFindItems = jest.fn(async () => ({
        items: rawItems,
        total: 2,
      }));

      const dataSource: DataSourceConfig<(typeof rawItems)[0]> = {
        findItems: mockFindItems,
      };

      const { result } = renderHook(
        () =>
          useContentListItemsQuery({
            dataSource,
            entityName: 'test',
            searchQueryText: '',
            filters: {},
            sort: { field: 'title', direction: 'asc' },
            page: { index: 0, size: 10 },
          }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.items).toHaveLength(2);
      expect(result.current.data?.items[0].title).toBe('Test Item 1');
    });
  });

  describe('onFetchSuccess callback', () => {
    it('should call onFetchSuccess when provided', async () => {
      const mockItems = createMockItems(5);
      const mockFindItems = jest.fn(createMockFindItems(mockItems));
      const onFetchSuccess = jest.fn();

      const dataSource = {
        findItems: mockFindItems,
        transform: identityTransform,
        onFetchSuccess,
      };

      const { result } = renderHook(
        () =>
          useContentListItemsQuery({
            dataSource,
            entityName: 'test',
            searchQueryText: '',
            filters: {},
            sort: { field: 'title', direction: 'asc' },
            page: { index: 0, size: 10 },
          }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(onFetchSuccess).toHaveBeenCalledTimes(1);
      expect(onFetchSuccess).toHaveBeenCalledWith({
        items: expect.any(Array),
        total: 5,
      });
    });
  });

  describe('enabled flag', () => {
    it('should not fetch when enabled is false', async () => {
      const mockItems = createMockItems(5);
      const mockFindItems = jest.fn(createMockFindItems(mockItems));
      const dataSource = {
        findItems: mockFindItems,
        transform: identityTransform,
      };

      const { result } = renderHook(
        () =>
          useContentListItemsQuery({
            dataSource,
            entityName: 'test',
            searchQueryText: '',
            filters: {},
            sort: { field: 'title', direction: 'asc' },
            page: { index: 0, size: 10 },
            enabled: false,
          }),
        { wrapper }
      );

      // Disabled queries should not start fetching immediately.
      expect(result.current.isFetching).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(mockFindItems).not.toHaveBeenCalled();

      // Flush any pending promises to ensure query doesn't start.
      await act(async () => {
        await flushPromises();
      });

      // Verify query remains disabled after a render cycle.
      expect(mockFindItems).not.toHaveBeenCalled();
      expect(result.current.isFetching).toBe(false);
      expect(result.current.data).toBeUndefined();
    });

    it('should start fetching when enabled changes from false to true', async () => {
      const mockItems = createMockItems(5);
      const mockFindItems = jest.fn(createMockFindItems(mockItems));
      const dataSource = {
        findItems: mockFindItems,
        transform: identityTransform,
      };

      const { result, rerender } = renderHook(
        ({ enabled }) =>
          useContentListItemsQuery({
            dataSource,
            entityName: 'test',
            searchQueryText: '',
            filters: {},
            sort: { field: 'title', direction: 'asc' },
            page: { index: 0, size: 10 },
            enabled,
          }),
        { wrapper, initialProps: { enabled: false } }
      );

      // Initially disabled - should not fetch.
      await act(async () => {
        await flushPromises();
      });
      expect(mockFindItems).not.toHaveBeenCalled();

      // Enable the query.
      rerender({ enabled: true });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockFindItems).toHaveBeenCalledTimes(1);
      expect(result.current.data?.items).toHaveLength(5);
    });
  });

  describe('error handling', () => {
    it('should handle fetch errors', async () => {
      const errorMessage = 'Failed to fetch items';
      const mockFindItems = jest.fn(async () => {
        throw new Error(errorMessage);
      });

      const dataSource = {
        findItems: mockFindItems,
        transform: identityTransform,
      };

      const { result } = renderHook(
        () =>
          useContentListItemsQuery({
            dataSource,
            entityName: 'test',
            searchQueryText: '',
            filters: {},
            sort: { field: 'title', direction: 'asc' },
            page: { index: 0, size: 10 },
          }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('query key generation', () => {
    it('should generate correct query keys', () => {
      expect(contentListKeys.all()).toEqual(['content-list']);
      expect(contentListKeys.all('dashboard')).toEqual(['content-list', 'dashboard']);
      expect(contentListKeys.all('dashboard', 'my-scope')).toEqual([
        'content-list',
        'dashboard',
        'my-scope',
      ]);

      const params = {
        searchQuery: 'test',
        filters: {},
        sort: { field: 'title', direction: 'asc' as const },
        page: { index: 0, size: 10 },
      };

      expect(contentListKeys.items('dashboard', undefined, params)).toEqual([
        'content-list',
        'dashboard',
        'items',
        params,
      ]);

      expect(contentListKeys.items('dashboard', 'my-scope', params)).toEqual([
        'content-list',
        'dashboard',
        'my-scope',
        'items',
        params,
      ]);
    });

    it('should generate unique keys for different entity names', () => {
      const params = {
        searchQuery: '',
        filters: {},
        sort: { field: 'title', direction: 'asc' as const },
        page: { index: 0, size: 10 },
      };

      const dashboardKey = contentListKeys.items('dashboard', undefined, params);
      const visualizationKey = contentListKeys.items('visualization', undefined, params);

      expect(dashboardKey).not.toEqual(visualizationKey);
      expect(dashboardKey[1]).toBe('dashboard');
      expect(visualizationKey[1]).toBe('visualization');
    });

    it('should generate unique keys for different scopes', () => {
      const params = {
        searchQuery: '',
        filters: {},
        sort: { field: 'title', direction: 'asc' as const },
        page: { index: 0, size: 10 },
      };

      const scope1Key = contentListKeys.items('dashboard', 'scope-1', params);
      const scope2Key = contentListKeys.items('dashboard', 'scope-2', params);
      const noScopeKey = contentListKeys.items('dashboard', undefined, params);

      expect(scope1Key).not.toEqual(scope2Key);
      expect(scope1Key).not.toEqual(noScopeKey);
      expect(scope1Key[2]).toBe('scope-1');
      expect(scope2Key[2]).toBe('scope-2');
    });

    it('should generate unique keys for different search queries', () => {
      const baseParams = {
        filters: {},
        sort: { field: 'title', direction: 'asc' as const },
        page: { index: 0, size: 10 },
      };

      const key1 = contentListKeys.items('test', undefined, { ...baseParams, searchQuery: 'foo' });
      const key2 = contentListKeys.items('test', undefined, { ...baseParams, searchQuery: 'bar' });

      expect(key1).not.toEqual(key2);
    });

    it('should generate unique keys for different pagination', () => {
      const baseParams = {
        searchQuery: '',
        filters: {},
        sort: { field: 'title', direction: 'asc' as const },
      };

      const page1Key = contentListKeys.items('test', undefined, {
        ...baseParams,
        page: { index: 0, size: 10 },
      });
      const page2Key = contentListKeys.items('test', undefined, {
        ...baseParams,
        page: { index: 1, size: 10 },
      });

      expect(page1Key).not.toEqual(page2Key);
    });

    it('should generate unique keys for different sort configurations', () => {
      const baseParams = {
        searchQuery: '',
        filters: {},
        page: { index: 0, size: 10 },
      };

      const ascKey = contentListKeys.items('test', undefined, {
        ...baseParams,
        sort: { field: 'title', direction: 'asc' as const },
      });
      const descKey = contentListKeys.items('test', undefined, {
        ...baseParams,
        sort: { field: 'title', direction: 'desc' as const },
      });

      expect(ascKey).not.toEqual(descKey);
    });
  });

  describe('query caching', () => {
    it('should cache queries with same parameters', async () => {
      const mockItems = createMockItems(5);
      const mockFindItems = jest.fn(createMockFindItems(mockItems));
      const dataSource = {
        findItems: mockFindItems,
        transform: identityTransform,
      };

      const { result, rerender } = renderHook(
        ({ searchQuery }) =>
          useContentListItemsQuery({
            dataSource,
            entityName: 'test',
            searchQueryText: searchQuery,
            filters: {},
            sort: { field: 'title', direction: 'asc' },
            page: { index: 0, size: 10 },
          }),
        { wrapper, initialProps: { searchQuery: 'test' } }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockFindItems).toHaveBeenCalledTimes(1);

      // Rerender with same query - should use cache.
      rerender({ searchQuery: 'test' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Should still be called only once due to caching.
      expect(mockFindItems).toHaveBeenCalledTimes(1);
    });

    it('should refetch when parameters change', async () => {
      const mockItems = createMockItems(5);
      const mockFindItems = jest.fn(createMockFindItems(mockItems));
      const dataSource = {
        findItems: mockFindItems,
        transform: identityTransform,
      };

      const { result, rerender } = renderHook(
        ({ searchQuery }) =>
          useContentListItemsQuery({
            dataSource,
            entityName: 'test',
            searchQueryText: searchQuery,
            filters: {},
            sort: { field: 'title', direction: 'asc' },
            page: { index: 0, size: 10 },
          }),
        { wrapper, initialProps: { searchQuery: 'test' } }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockFindItems).toHaveBeenCalledTimes(1);

      // Change query - should refetch.
      rerender({ searchQuery: 'new query' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockFindItems).toHaveBeenCalledTimes(2);
    });
  });
});
