/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, act } from '@testing-library/react';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { useESQLQueryStats } from './use_esql_query_stats';

describe('useESQLQueryStats', () => {
  let mockRequestAdapter: RequestAdapter;

  beforeEach(() => {
    mockRequestAdapter = new RequestAdapter();
  });

  it('should return undefined when isEsqlMode is false', () => {
    const { result } = renderHook(() => useESQLQueryStats(false, mockRequestAdapter));

    expect(result.current).toBeUndefined();
  });

  it('should return undefined when requestAdapter is not provided', () => {
    const { result } = renderHook(() => useESQLQueryStats(true, undefined));

    expect(result.current).toBeUndefined();
  });

  it('should return undefined when there are no requests', () => {
    const { result } = renderHook(() => useESQLQueryStats(true, mockRequestAdapter));

    expect(result.current).toBeUndefined();
  });

  it('should extract query stats from the latest request', () => {
    const { result } = renderHook(() => useESQLQueryStats(true, mockRequestAdapter));

    act(() => {
      const request = mockRequestAdapter.start('test', { id: 'test-id' });
      request.stats({
        queryTime: { label: 'Query time', value: '150ms', description: 'Query time' },
        documentsProcessed: {
          label: 'Documents processed',
          value: 5000,
          description: 'Documents processed',
        },
      });
      mockRequestAdapter.emit('change');
    });

    expect(result.current).toEqual({
      durationInMs: '150ms',
      totalDocumentsProcessed: 5000,
    });
  });

  it('should update query stats when a new request is added', () => {
    const { result } = renderHook(() => useESQLQueryStats(true, mockRequestAdapter));

    act(() => {
      const request1 = mockRequestAdapter.start('test1', { id: 'test-id-1' });
      request1.stats({
        queryTime: { label: 'Query time', value: '100ms', description: 'Query time' },
        documentsProcessed: {
          label: 'Documents processed',
          value: 1000,
          description: 'Documents processed',
        },
      });
      mockRequestAdapter.emit('change');
    });

    expect(result.current).toEqual({
      durationInMs: '100ms',
      totalDocumentsProcessed: 1000,
    });

    act(() => {
      const request2 = mockRequestAdapter.start('test2', { id: 'test-id-2' });
      request2.stats({
        queryTime: { label: 'Query time', value: '250ms', description: 'Query time' },
        documentsProcessed: {
          label: 'Documents processed',
          value: 3000,
          description: 'Documents processed',
        },
      });
      mockRequestAdapter.emit('change');
    });

    expect(result.current).toEqual({
      durationInMs: '250ms',
      totalDocumentsProcessed: 3000,
    });
  });

  it('should unsubscribe from request adapter on unmount', () => {
    const { unmount } = renderHook(() => useESQLQueryStats(true, mockRequestAdapter));

    const offSpy = jest.spyOn(mockRequestAdapter, 'off');

    unmount();

    expect(offSpy).toHaveBeenCalledWith('change', expect.any(Function));
  });
});
