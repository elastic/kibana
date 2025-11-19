/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { waitFor } from '@testing-library/react';
import { useContentListState } from './use_content_list_state';
import { renderHookWithProvider } from '../test_utils';

describe('ContentListStateProvider', () => {
  describe('State initialization', () => {
    it('should have empty items when data source returns empty', async () => {
      const emptyFindItems = jest.fn(async () => ({ items: [], total: 0 }));
      const { result } = await renderHookWithProvider(() => useContentListState(), {
        providerOverrides: {
          dataSource: { findItems: emptyFindItems },
        },
      });

      expect(result.current.state.items).toEqual([]);
      expect(result.current.state.totalItems).toBe(0);
    });

    it('should initialize with isLoading false after fetch completes', async () => {
      const { result } = await renderHookWithProvider(() => useContentListState());

      // Wait for the query to complete - isLoading should eventually be false
      await waitFor(() => {
        expect(result.current.state.isLoading).toBe(false);
      });
    });

    it('should initialize with empty search query', async () => {
      const { result } = await renderHookWithProvider(() => useContentListState());

      expect(result.current.state.search.queryText).toBe('');
    });

    it('should initialize with default filters', async () => {
      const { result } = await renderHookWithProvider(() => useContentListState());

      expect(result.current.state.filters).toEqual({
        search: undefined,
        tags: {
          include: [],
          exclude: [],
        },
        users: [],
        starredOnly: false,
      });
    });

    it('should initialize with default sort (title ascending)', async () => {
      const { result } = await renderHookWithProvider(() => useContentListState());

      expect(result.current.state.sort).toEqual({
        field: 'title',
        direction: 'asc',
      });
    });

    it('should initialize with default pagination (page 0, size 20)', async () => {
      const { result } = await renderHookWithProvider(() => useContentListState());

      expect(result.current.state.page).toEqual({
        index: 0,
        size: 20,
      });
    });

    it('should initialize with empty selection', async () => {
      const { result } = await renderHookWithProvider(() => useContentListState());

      expect(result.current.state.selectedItems.size).toBe(0);
    });
  });

  describe('Configuration-driven initialization', () => {
    it('should respect initialPageSize from pagination config', async () => {
      const { result } = await renderHookWithProvider(() => useContentListState(), {
        providerOverrides: {
          features: {
            pagination: {
              initialPageSize: 50,
            },
          },
        },
      });

      expect(result.current.state.page.size).toBe(50);
      expect(result.current.state.page.index).toBe(0);
    });

    it('should respect initialSort from sorting config', async () => {
      const { result } = await renderHookWithProvider(() => useContentListState(), {
        providerOverrides: {
          features: {
            sorting: {
              initialSort: {
                field: 'updatedAt',
                direction: 'desc',
              },
            },
          },
        },
      });

      expect(result.current.state.sort).toEqual({
        field: 'updatedAt',
        direction: 'desc',
      });
    });

    it('should respect initialQuery from search config', async () => {
      const { result } = await renderHookWithProvider(() => useContentListState(), {
        providerOverrides: {
          features: {
            search: {
              initialQuery: 'test query',
            },
          },
        },
      });

      expect(result.current.state.search.queryText).toBe('test query');
    });

    it('should respect isReadOnly flag', async () => {
      const { result } = await renderHookWithProvider(() => useContentListState(), {
        providerOverrides: {
          isReadOnly: true,
        },
      });

      expect(result.current.state.isReadOnly).toBe(true);
    });
  });

  describe('Context values', () => {
    it('should provide state, dispatch, and refetch', async () => {
      const { result } = await renderHookWithProvider(() => useContentListState());

      expect(result.current.state).toBeDefined();
      expect(typeof result.current.dispatch).toBe('function');
      expect(typeof result.current.refetch).toBe('function');
    });

    it('should provide configuration values', async () => {
      const { result } = await renderHookWithProvider(() => useContentListState(), {
        providerOverrides: {
          entityName: 'dashboard',
          entityNamePlural: 'dashboards',
        },
      });

      expect(result.current.entityName).toBe('dashboard');
      expect(result.current.entityNamePlural).toBe('dashboards');
    });
  });

  describe('Data fetching integration', () => {
    it('should trigger initial fetch on mount', async () => {
      const mockFindItems = jest.fn(async () => ({
        items: [
          {
            id: '1',
            type: 'test',
            updatedAt: '2024-01-01T00:00:00Z',
            attributes: { title: 'Item 1' },
            references: [],
            namespaces: ['default'],
            version: 'v1',
            managed: false,
          },
        ],
        total: 1,
      }));

      await renderHookWithProvider(() => useContentListState(), {
        providerOverrides: {
          dataSource: { findItems: mockFindItems },
        },
      });

      await waitFor(() => {
        expect(mockFindItems).toHaveBeenCalled();
      });
    });

    it('should pass correct parameters to findItems', async () => {
      const mockFindItems = jest.fn(async () => ({
        items: [],
        total: 0,
      }));

      // Provider is agnostic - always passes actual params to findItems.
      // The findItems implementation decides how to use them.
      await renderHookWithProvider(() => useContentListState(), {
        providerOverrides: {
          dataSource: { findItems: mockFindItems },
          features: {
            search: { initialQuery: 'test' },
            sorting: {
              initialSort: { field: 'updatedAt', direction: 'desc' },
            },
            pagination: { initialPageSize: 50 },
          },
        },
      });

      await waitFor(() => {
        // Provider passes actual search query, sort, and page params to findItems.
        expect(mockFindItems).toHaveBeenCalledWith(
          expect.objectContaining({
            searchQuery: 'test',
            sort: { field: 'updatedAt', direction: 'desc' },
            page: { index: 0, size: 50 },
          })
        );
      });
    });
  });
});
