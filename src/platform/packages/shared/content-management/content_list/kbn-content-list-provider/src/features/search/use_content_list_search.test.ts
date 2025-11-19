/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, act } from '@testing-library/react';
import { useContentListSearch } from './use_content_list_search';
import { renderHookWithProvider } from '../../test_utils';

describe('useContentListSearch', () => {
  it('should return initial empty query text', async () => {
    const { result } = await renderHookWithProvider(() => useContentListSearch());

    expect(result.current.queryText).toBe('');
  });

  it('should update queryText when setSearch is called', async () => {
    const { result } = await renderHookWithProvider(() => useContentListSearch());

    act(() => {
      result.current.setSearch('test query');
    });

    expect(result.current.queryText).toBe('test query');
  });

  it('should clear query when clearSearch is called', async () => {
    const { result } = await renderHookWithProvider(() => useContentListSearch());

    act(() => {
      result.current.setSearch('initial query');
    });

    expect(result.current.queryText).toBe('initial query');

    act(() => {
      result.current.clearSearch();
    });

    expect(result.current.queryText).toBe('');
  });

  it('should provide setSearch function', async () => {
    const { result } = await renderHookWithProvider(() => useContentListSearch());

    expect(typeof result.current.setSearch).toBe('function');
  });

  it('should provide clearSearch function', async () => {
    const { result } = await renderHookWithProvider(() => useContentListSearch());

    expect(typeof result.current.clearSearch).toBe('function');
  });

  it('should memoize callbacks', async () => {
    const { result, rerender } = await renderHookWithProvider(() => useContentListSearch());

    const firstSetSearch = result.current.setSearch;
    const firstClearSearch = result.current.clearSearch;

    rerender();

    expect(result.current.setSearch).toBe(firstSetSearch);
    expect(result.current.clearSearch).toBe(firstClearSearch);
  });

  it('should throw error when used outside provider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useContentListSearch());
    }).toThrow('ContentList hooks must be used within ContentListProvider');

    consoleError.mockRestore();
  });
});
