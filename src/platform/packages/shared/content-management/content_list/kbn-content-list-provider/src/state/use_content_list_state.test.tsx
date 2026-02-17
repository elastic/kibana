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

  it('returns state, dispatch, and refetch', () => {
    const { result } = renderHook(() => useContentListState(), {
      wrapper: createWrapper(),
    });

    expect(result.current.state).toBeDefined();
    expect(result.current.dispatch).toBeInstanceOf(Function);
    expect(result.current.refetch).toBeInstanceOf(Function);
  });

  it('provides state with expected shape', () => {
    const { result } = renderHook(() => useContentListState(), {
      wrapper: createWrapper(),
    });

    const { state } = result.current;
    expect(state).toHaveProperty('search');
    expect(state).toHaveProperty('filters');
    expect(state).toHaveProperty('sort');
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
});
