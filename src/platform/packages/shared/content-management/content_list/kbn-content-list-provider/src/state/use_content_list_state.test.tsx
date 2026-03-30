/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { ContentListProvider } from '../context';
import type { FindItemsResult, FindItemsParams } from '../datasource';
import { useContentListState } from './use_content_list_state';
import { CONTENT_LIST_ACTIONS } from './types';

describe('useContentListState', () => {
  const mockFindItems = jest.fn(
    async (_params: FindItemsParams): Promise<FindItemsResult> => ({
      items: [],
      total: 0,
    })
  );

  const createWrapper = () => {
    return ({ children }: { children: React.ReactNode }) => (
      <ContentListProvider
        id="test-list"
        labels={{ entity: 'item', entityPlural: 'items' }}
        dataSource={{ findItems: mockFindItems }}
      >
        {children}
      </ContentListProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws when used outside provider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useContentListState());
    }).toThrow(
      'ContentListStateContext is missing. Ensure your component is wrapped with ContentListProvider.'
    );

    consoleSpy.mockRestore();
  });

  it('returns state, dispatch, and refetch when inside provider', () => {
    const { result } = renderHook(() => useContentListState(), {
      wrapper: createWrapper(),
    });

    expect(result.current).toHaveProperty('state');
    expect(result.current).toHaveProperty('dispatch');
    expect(result.current).toHaveProperty('refetch');
  });

  it('returns state with the expected shape', () => {
    const { result } = renderHook(() => useContentListState(), {
      wrapper: createWrapper(),
    });

    const { state } = result.current;

    // Client state.
    expect(state).toHaveProperty('search');
    expect(state.search).toHaveProperty('queryText');
    expect(state).toHaveProperty('filters');
    expect(state).toHaveProperty('sort');
    expect(state.sort).toHaveProperty('field');
    expect(state.sort).toHaveProperty('direction');

    // Query data.
    expect(state).toHaveProperty('items');
    expect(state).toHaveProperty('totalItems');
    expect(state).toHaveProperty('isLoading');
    expect(state).toHaveProperty('isFetching');
  });

  it('dispatch updates search query text and filters atomically', () => {
    const { result } = renderHook(() => useContentListState(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.dispatch({
        type: CONTENT_LIST_ACTIONS.SET_SEARCH,
        payload: { queryText: 'test query', filters: { search: 'test query' } },
      });
    });

    expect(result.current.state.search.queryText).toBe('test query');
    expect(result.current.state.filters).toEqual({ search: 'test query' });
  });

  it('provides dispatch as a function', () => {
    const { result } = renderHook(() => useContentListState(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.dispatch).toBe('function');
  });

  it('provides refetch as a function', () => {
    const { result } = renderHook(() => useContentListState(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.refetch).toBe('function');
  });
});
