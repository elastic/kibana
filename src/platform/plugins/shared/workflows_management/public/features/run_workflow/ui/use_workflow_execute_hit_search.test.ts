/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import type { EsHitRecord } from '@kbn/discover-utils/types';
import {
  buildWorkflowExecuteHitSearchIdentityKey,
  useWorkflowExecuteHitSearch,
} from './use_workflow_execute_hit_search';

const hit: EsHitRecord = { _id: '1', _index: 'logs-*', _source: { message: 'hello' } };

describe('buildWorkflowExecuteHitSearchIdentityKey', () => {
  it('includes data view, query, time range, and sort', () => {
    expect(
      buildWorkflowExecuteHitSearchIdentityKey({
        dataViewId: 'dv-1',
        submittedQueryString: 'message: test',
        timeRange: { from: 'now-15m', to: 'now' },
        tableSort: [['@timestamp', 'desc']],
      })
    ).toBe('dv-1|message: test|now-15m|now|@timestamp:desc');
  });
});

describe('useWorkflowExecuteHitSearch', () => {
  const baseOptions = {
    enabled: true,
    searchIdentityKey: 'identity-1',
    setErrors: jest.fn(),
    resolveFetchError: () => 'fetch failed',
  };

  it('fetches the first page when enabled', async () => {
    const fetchPage = jest.fn().mockResolvedValue({ pageHits: [hit], total: 1 });

    const { result } = renderHook(() =>
      useWorkflowExecuteHitSearch({
        ...baseOptions,
        fetchPage,
      })
    );

    await waitFor(() => {
      expect(result.current.hits).toEqual([hit]);
    });

    expect(fetchPage).toHaveBeenCalledWith(0);
    expect(result.current.totalHits).toBe(1);
    expect(baseOptions.setErrors).toHaveBeenCalledWith(null);
  });

  it('resets results and refetches when the search identity changes', async () => {
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce({ pageHits: [hit], total: 1 })
      .mockResolvedValueOnce({
        pageHits: [{ _id: '2', _index: 'logs-*', _source: { message: 'next' } }],
        total: 1,
      });

    const { result, rerender } = renderHook(
      ({ searchIdentityKey }: { searchIdentityKey: string }) =>
        useWorkflowExecuteHitSearch({
          ...baseOptions,
          searchIdentityKey,
          fetchPage,
        }),
      { initialProps: { searchIdentityKey: 'identity-1' } }
    );

    await waitFor(() => {
      expect(result.current.hits).toEqual([hit]);
    });

    rerender({ searchIdentityKey: 'identity-2' });

    await waitFor(() => {
      expect(result.current.hits).toEqual([
        { _id: '2', _index: 'logs-*', _source: { message: 'next' } },
      ]);
    });

    expect(fetchPage).toHaveBeenLastCalledWith(0);
  });

  it('loads the next page when onFetchMoreRecords is invoked', async () => {
    const secondHit: EsHitRecord = { _id: '2', _index: 'logs-*', _source: { message: 'more' } };
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce({ pageHits: [hit], total: 2 })
      .mockResolvedValueOnce({ pageHits: [secondHit], total: 2 });

    const { result } = renderHook(() =>
      useWorkflowExecuteHitSearch({
        ...baseOptions,
        fetchPage,
      })
    );

    await waitFor(() => {
      expect(result.current.onFetchMoreRecords).toBeDefined();
    });

    act(() => {
      result.current.onFetchMoreRecords?.();
    });

    await waitFor(() => {
      expect(result.current.hits).toEqual([hit, secondHit]);
    });

    expect(fetchPage).toHaveBeenLastCalledWith(1);
  });
});
