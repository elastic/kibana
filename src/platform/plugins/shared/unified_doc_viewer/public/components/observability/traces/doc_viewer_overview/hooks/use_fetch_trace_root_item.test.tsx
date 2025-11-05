/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { waitFor, renderHook } from '@testing-library/react';
import type { TraceRootItem } from '@kbn/apm-types';
import { TraceRootItemProvider, useFetchTraceRootItemContext } from './use_fetch_trace_root_item';
import { getUnifiedDocViewerServices } from '../../../../../plugin';

jest.mock('../../../../../plugin', () => ({
  getUnifiedDocViewerServices: jest.fn(),
}));

const mockFetchRootItemByTraceId = jest.fn<Promise<TraceRootItem | undefined>, any>();
const mockGetAbsoluteTime = jest.fn(() => ({
  from: '2023-01-01T00:00:00.000Z',
  to: '2023-01-01T01:00:00.000Z',
}));

const mockGetById: jest.Mock<
  | {
      fetchRootItemByTraceId: jest.Mock<Promise<TraceRootItem | undefined>>;
    }
  | undefined
> = jest.fn(() => ({
  fetchRootItemByTraceId: mockFetchRootItemByTraceId,
}));

(getUnifiedDocViewerServices as jest.Mock).mockReturnValue({
  data: {
    query: {
      timefilter: {
        timefilter: {
          getAbsoluteTime: mockGetAbsoluteTime,
        },
      },
    },
  },
  discoverShared: {
    features: {
      registry: {
        getById: mockGetById,
      },
    },
  },
});

beforeEach(() => {
  jest.clearAllMocks();
  mockGetById.mockReturnValue({
    fetchRootItemByTraceId: mockFetchRootItemByTraceId,
  });
});

describe('useFetchTraceRootItem hook', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <TraceRootItemProvider traceId="test-trace">{children}</TraceRootItemProvider>
  );

  it('should return undefined when feature is not registered', async () => {
    mockGetById.mockReturnValue(undefined);

    const { result } = renderHook(() => useFetchTraceRootItemContext(), { wrapper });

    await waitFor(() => !result.current.loading);

    expect(result.current.loading).toBe(false);
    expect(result.current.item).toBeUndefined();
    expect(mockFetchRootItemByTraceId).not.toHaveBeenCalled();
  });

  it('should start with loading true and item as undefined', async () => {
    mockFetchRootItemByTraceId.mockImplementation(
      () => new Promise(() => {}) // Never resolves to keep loading
    );

    const { result } = renderHook(() => useFetchTraceRootItemContext(), { wrapper });

    expect(result.current.loading).toBe(true);
    expect(result.current.item).toBeUndefined();
    expect(mockFetchRootItemByTraceId).toHaveBeenCalledWith(
      {
        traceId: 'test-trace',
        start: '2023-01-01T00:00:00.000Z',
        end: '2023-01-01T01:00:00.000Z',
      },
      expect.any(AbortSignal)
    );
  });

  it('should return undefined when traceId is empty', async () => {
    const emptyTraceIdWrapper = ({ children }: { children: React.ReactNode }) => (
      <TraceRootItemProvider traceId="">{children}</TraceRootItemProvider>
    );

    const { result } = renderHook(() => useFetchTraceRootItemContext(), {
      wrapper: emptyTraceIdWrapper,
    });

    await waitFor(() => !result.current.loading);

    expect(result.current.loading).toBe(false);
    expect(result.current.item).toBeUndefined();
    expect(mockFetchRootItemByTraceId).not.toHaveBeenCalled();
  });

  it('should update item when data is fetched successfully', async () => {
    const mockItem: TraceRootItem = { duration: 1000 };
    mockFetchRootItemByTraceId.mockResolvedValue(mockItem);

    const { result } = renderHook(() => useFetchTraceRootItemContext(), { wrapper });

    await waitFor(() => !result.current.loading);

    expect(result.current.loading).toBe(false);
    expect(result.current.item).toEqual(mockItem);
    expect(result.current.item?.duration).toBe(1000);
    expect(mockFetchRootItemByTraceId).toHaveBeenCalledWith(
      {
        traceId: 'test-trace',
        start: '2023-01-01T00:00:00.000Z',
        end: '2023-01-01T01:00:00.000Z',
      },
      expect.any(AbortSignal)
    );
  });

  it('should handle when item is not found (returns undefined)', async () => {
    mockFetchRootItemByTraceId.mockResolvedValue(undefined);

    const { result } = renderHook(() => useFetchTraceRootItemContext(), { wrapper });

    await waitFor(() => !result.current.loading);

    expect(result.current.loading).toBe(false);
    expect(result.current.item).toBeUndefined();
    expect(mockFetchRootItemByTraceId).toHaveBeenCalledTimes(1);
  });

  it('should handle errors and set error state', async () => {
    const errorMessage = 'Fetch error';
    mockFetchRootItemByTraceId.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useFetchTraceRootItemContext(), { wrapper });

    await waitFor(() => !result.current.loading);

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe(errorMessage);
    expect(result.current.item).toBeUndefined();
    expect(mockFetchRootItemByTraceId).toHaveBeenCalledTimes(1);
  });

  it('should refetch when traceId changes', async () => {
    const mockItem1: TraceRootItem = { duration: 1000 };
    const mockItem2: TraceRootItem = { duration: 2000 };
    mockFetchRootItemByTraceId.mockResolvedValueOnce(mockItem1).mockResolvedValueOnce(mockItem2);

    const wrapper1 = ({ children }: { children: React.ReactNode }) => (
      <TraceRootItemProvider traceId="trace-1">{children}</TraceRootItemProvider>
    );
    const wrapper2 = ({ children }: { children: React.ReactNode }) => (
      <TraceRootItemProvider traceId="trace-2">{children}</TraceRootItemProvider>
    );

    const { result: result1 } = renderHook(() => useFetchTraceRootItemContext(), {
      wrapper: wrapper1,
    });

    await waitFor(() => !result1.current.loading);
    expect(result1.current.item?.duration).toBe(1000);
    expect(mockFetchRootItemByTraceId).toHaveBeenCalledWith(
      {
        traceId: 'trace-1',
        start: '2023-01-01T00:00:00.000Z',
        end: '2023-01-01T01:00:00.000Z',
      },
      expect.any(AbortSignal)
    );

    const { result: result2 } = renderHook(() => useFetchTraceRootItemContext(), {
      wrapper: wrapper2,
    });

    await waitFor(() => !result2.current.loading);
    expect(result2.current.item?.duration).toBe(2000);
    expect(mockFetchRootItemByTraceId).toHaveBeenCalledWith(
      {
        traceId: 'trace-2',
        start: '2023-01-01T00:00:00.000Z',
        end: '2023-01-01T01:00:00.000Z',
      },
      expect.any(AbortSignal)
    );
    expect(mockFetchRootItemByTraceId).toHaveBeenCalledTimes(2);
  });

  it('should pass AbortSignal to fetchRootItemByTraceId', async () => {
    mockFetchRootItemByTraceId.mockImplementation(({ signal }: { signal: AbortSignal }) => {
      expect(signal).toBeInstanceOf(AbortSignal);
      return Promise.resolve({ duration: 1000 });
    });

    const { result } = renderHook(() => useFetchTraceRootItemContext(), { wrapper });

    await waitFor(() => !result.current.loading);

    expect(mockFetchRootItemByTraceId).toHaveBeenCalledWith(
      expect.objectContaining({
        traceId: 'test-trace',
        start: '2023-01-01T00:00:00.000Z',
        end: '2023-01-01T01:00:00.000Z',
      }),
      expect.any(AbortSignal)
    );
  });
});
