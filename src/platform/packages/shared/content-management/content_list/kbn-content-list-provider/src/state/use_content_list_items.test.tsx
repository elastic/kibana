/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { ContentListProvider } from '../context';
import type { ContentListProviderProps } from '../context';
import type { FindItemsResult, FindItemsParams, DataSourceConfig } from '../datasource';
import type { ContentListItem } from '../item';
import { useContentListItems } from './use_content_list_items';

const mockItems: ContentListItem[] = [
  { id: '1', title: 'Dashboard A', description: 'First dashboard' },
  { id: '2', title: 'Dashboard B', description: 'Second dashboard' },
  { id: '3', title: 'Dashboard C' },
];

describe('useContentListItems', () => {
  const createMockFindItems = (
    result: FindItemsResult = { items: mockItems, total: mockItems.length }
  ) => jest.fn(async (_params: FindItemsParams): Promise<FindItemsResult> => result);

  const createWrapper = (
    dataSource: DataSourceConfig,
    overrides?: Partial<ContentListProviderProps>
  ) => {
    return ({ children }: { children: React.ReactNode }) => (
      <ContentListProvider
        id={overrides?.id ?? 'test-items'}
        labels={{ entity: 'dashboard', entityPlural: 'dashboards' }}
        dataSource={dataSource}
        {...overrides}
      >
        {children}
      </ContentListProvider>
    );
  };

  describe('successful fetch', () => {
    it('returns items from the data source', async () => {
      const findItems = createMockFindItems();
      const { result } = renderHook(() => useContentListItems(), {
        wrapper: createWrapper({ findItems }),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.items).toEqual(mockItems);
      expect(result.current.totalItems).toBe(3);
    });

    it('returns empty items when data source returns no results', async () => {
      const findItems = createMockFindItems({ items: [], total: 0 });
      const { result } = renderHook(() => useContentListItems(), {
        wrapper: createWrapper({ findItems }, { id: 'empty-items' }),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.items).toEqual([]);
      expect(result.current.totalItems).toBe(0);
    });
  });

  describe('loading states', () => {
    it('starts with isLoading true', () => {
      const findItems = jest.fn(
        () => new Promise<FindItemsResult>(() => {}) // Never resolves.
      );
      const { result } = renderHook(() => useContentListItems(), {
        wrapper: createWrapper({ findItems }, { id: 'loading-items' }),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isFetching).toBe(true);
    });

    it('sets isLoading to false after fetch completes', async () => {
      const findItems = createMockFindItems();
      const { result } = renderHook(() => useContentListItems(), {
        wrapper: createWrapper({ findItems }, { id: 'loaded-items' }),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isFetching).toBe(false);
    });
  });

  describe('error handling', () => {
    it('returns error when fetch fails with Error', async () => {
      const findItems = jest.fn(async () => {
        throw new Error('Network failure');
      });
      const { result } = renderHook(() => useContentListItems(), {
        wrapper: createWrapper({ findItems }, { id: 'error-items' }),
      });

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Network failure');
    });

    it('normalizes non-Error thrown values to Error instances', async () => {
      const findItems = jest.fn(async () => {
        throw 'string error'; // eslint-disable-line no-throw-literal
      });
      const { result } = renderHook(() => useContentListItems(), {
        wrapper: createWrapper({ findItems }, { id: 'string-error-items' }),
      });

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('string error');
    });

    it('returns no error on successful fetch', async () => {
      const findItems = createMockFindItems();
      const { result } = renderHook(() => useContentListItems(), {
        wrapper: createWrapper({ findItems }, { id: 'no-error-items' }),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeUndefined();
    });
  });

  describe('onFetchSuccess callback', () => {
    it('calls onFetchSuccess after successful fetch', async () => {
      const fetchResult = { items: mockItems, total: mockItems.length };
      const findItems = createMockFindItems(fetchResult);
      const onFetchSuccess = jest.fn();

      const { result } = renderHook(() => useContentListItems(), {
        wrapper: createWrapper({ findItems, onFetchSuccess }, { id: 'success-callback-items' }),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(onFetchSuccess).toHaveBeenCalledWith(fetchResult);
    });

    it('logs warning when onFetchSuccess throws', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const findItems = createMockFindItems();
      const onFetchSuccess = jest.fn(() => {
        throw new Error('callback error');
      });

      const { result } = renderHook(() => useContentListItems(), {
        wrapper: createWrapper({ findItems, onFetchSuccess }, { id: 'callback-error-items' }),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        '[ContentListProvider] onFetchSuccess callback error:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('refetch', () => {
    it('provides a refetch function', async () => {
      const findItems = createMockFindItems();
      const { result } = renderHook(() => useContentListItems(), {
        wrapper: createWrapper({ findItems }, { id: 'refetch-items' }),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.refetch).toBeInstanceOf(Function);
    });
  });
});
