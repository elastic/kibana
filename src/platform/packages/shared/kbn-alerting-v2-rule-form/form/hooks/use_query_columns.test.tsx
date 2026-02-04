/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, waitFor } from '@testing-library/react';
import { getESQLQueryColumnsRaw } from '@kbn/esql-utils';
import { useQueryColumns } from './use_query_columns';

jest.mock('@kbn/esql-utils');

const mockGetESQLQueryColumnsRaw = jest.mocked(getESQLQueryColumnsRaw);

const createMockSearch = () => jest.fn() as any;

describe('useQueryColumns', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty columns when query is empty', async () => {
    const search = createMockSearch();
    const { result } = renderHook(() =>
      useQueryColumns({
        query: '',
        search,
      })
    );

    expect(result.current.columns).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockGetESQLQueryColumnsRaw).not.toHaveBeenCalled();
  });

  it('fetches columns when query is provided', async () => {
    const mockColumns = [
      { name: 'host.name', type: 'keyword' },
      { name: 'count', type: 'long' },
    ];

    mockGetESQLQueryColumnsRaw.mockResolvedValue(mockColumns);
    const search = createMockSearch();

    const { result } = renderHook(() =>
      useQueryColumns({
        query: 'FROM logs-* | STATS count = COUNT(*) BY host.name',
        search,
      })
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.columns).toEqual([
      { name: 'host.name', type: 'keyword' },
      { name: 'count', type: 'long' },
    ]);
    expect(result.current.error).toBeNull();
    expect(mockGetESQLQueryColumnsRaw).toHaveBeenCalledWith({
      esqlQuery: 'FROM logs-* | STATS count = COUNT(*) BY host.name',
      search: expect.any(Function),
      signal: expect.any(AbortSignal),
      dropNullColumns: true,
    });
  });

  it('handles errors gracefully', async () => {
    const testError = new Error('Query parsing failed');
    mockGetESQLQueryColumnsRaw.mockRejectedValue(testError);
    const search = createMockSearch();

    const { result } = renderHook(() =>
      useQueryColumns({
        query: 'INVALID QUERY',
        search,
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.columns).toEqual([]);
    expect(result.current.error).toEqual(testError);
  });

  it('ignores abort errors', async () => {
    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';
    mockGetESQLQueryColumnsRaw.mockRejectedValue(abortError);
    const search = createMockSearch();

    const { result } = renderHook(() =>
      useQueryColumns({
        query: 'FROM logs-* | LIMIT 10',
        search,
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should not set error for abort errors
    expect(result.current.error).toBeNull();
  });

  it('aborts previous request when query changes', async () => {
    const mockColumns = [{ name: 'test', type: 'keyword' }];
    mockGetESQLQueryColumnsRaw.mockResolvedValue(mockColumns);
    const search = createMockSearch();

    const { rerender } = renderHook(
      ({ query }) =>
        useQueryColumns({
          query,
          search,
        }),
      { initialProps: { query: 'FROM logs-* | LIMIT 10' } }
    );

    // Change query immediately to trigger abort
    rerender({ query: 'FROM metrics-* | LIMIT 10' });

    await waitFor(() => {
      expect(mockGetESQLQueryColumnsRaw).toHaveBeenCalledTimes(2);
    });
  });

  it('maps raw columns to QueryColumn type', async () => {
    const mockRawColumns = [
      { name: 'field1', type: 'keyword', extra: 'ignored' },
      { name: 'field2', type: 'long', anotherExtra: 'also ignored' },
    ];

    mockGetESQLQueryColumnsRaw.mockResolvedValue(mockRawColumns as any);
    const search = createMockSearch();

    const { result } = renderHook(() =>
      useQueryColumns({
        query: 'FROM logs-* | LIMIT 10',
        search,
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should only include name and type
    expect(result.current.columns).toEqual([
      { name: 'field1', type: 'keyword' },
      { name: 'field2', type: 'long' },
    ]);
  });

  it('handles non-Error objects in catch block', async () => {
    mockGetESQLQueryColumnsRaw.mockRejectedValue('string error');
    const search = createMockSearch();

    const { result } = renderHook(() =>
      useQueryColumns({
        query: 'FROM logs-* | LIMIT 10',
        search,
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toEqual(new Error('Unknown error'));
  });
});
