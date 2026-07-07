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
import type { TraceRootSpan } from '@kbn/apm-types';
import { TraceRootSpanProvider, useFetchTraceRootSpanContext } from './use_fetch_trace_root_span';
import { getUnifiedDocViewerServices } from '../../../../../plugin';

jest.mock('../../../../../plugin', () => ({
  getUnifiedDocViewerServices: jest.fn(),
}));

const mockFetchRootSpanByTraceId = jest.fn<Promise<TraceRootSpan | undefined>, any>();
const mockGetAbsoluteTime = jest.fn(() => ({
  from: '2023-01-01T00:00:00.000Z',
  to: '2023-01-01T01:00:00.000Z',
}));

const mockGetById: jest.Mock<
  | {
      fetchRootSpanByTraceId: jest.Mock<Promise<TraceRootSpan | undefined>>;
    }
  | undefined
> = jest.fn(() => ({
  fetchRootSpanByTraceId: mockFetchRootSpanByTraceId,
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
    fetchRootSpanByTraceId: mockFetchRootSpanByTraceId,
  });
});

describe('useFetchTraceRootSpan hook', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <TraceRootSpanProvider traceId="test-trace">{children}</TraceRootSpanProvider>
  );

  it('should return undefined when feature is not registered', async () => {
    mockGetById.mockReturnValue(undefined);

    const { result } = renderHook(() => useFetchTraceRootSpanContext(), { wrapper });

    await waitFor(() => !result.current.loading);

    expect(result.current.loading).toBe(false);
    expect(result.current.span).toBeUndefined();
    expect(mockFetchRootSpanByTraceId).not.toHaveBeenCalled();
  });

  it('should start with loading true and item as undefined', async () => {
    mockFetchRootSpanByTraceId.mockImplementation(
      () => new Promise(() => {}) // Never resolves to keep loading
    );

    const { result } = renderHook(() => useFetchTraceRootSpanContext(), { wrapper });

    expect(result.current.loading).toBe(true);
    expect(result.current.span).toBeUndefined();
    expect(mockFetchRootSpanByTraceId).toHaveBeenCalledWith(
      {
        traceId: 'test-trace',
        start: '2023-01-01T00:00:00.000Z',
        end: '2023-01-01T01:00:00.000Z',
      },
      expect.any(AbortSignal)
    );
  });

  it('should update item when data is fetched successfully', async () => {
    const mockSpan: TraceRootSpan = { duration: 1000 };
    mockFetchRootSpanByTraceId.mockResolvedValue(mockSpan);

    const { result } = renderHook(() => useFetchTraceRootSpanContext(), { wrapper });

    await waitFor(() => !result.current.loading);

    expect(result.current.loading).toBe(false);
    expect(result.current.span).toEqual(mockSpan);
    expect(result.current.span?.duration).toBe(1000);
    expect(mockFetchRootSpanByTraceId).toHaveBeenCalledWith(
      {
        traceId: 'test-trace',
        start: '2023-01-01T00:00:00.000Z',
        end: '2023-01-01T01:00:00.000Z',
      },
      expect.any(AbortSignal)
    );
  });

  it('should handle when item is not found (returns undefined)', async () => {
    mockFetchRootSpanByTraceId.mockResolvedValue(undefined);

    const { result } = renderHook(() => useFetchTraceRootSpanContext(), { wrapper });

    await waitFor(() => !result.current.loading);

    expect(result.current.loading).toBe(false);
    expect(result.current.span).toBeUndefined();
    expect(mockFetchRootSpanByTraceId).toHaveBeenCalledTimes(1);
  });

  it('should handle errors and set error state', async () => {
    const errorMessage = 'Fetch error';
    mockFetchRootSpanByTraceId.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useFetchTraceRootSpanContext(), { wrapper });

    await waitFor(() => !result.current.loading);

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe(errorMessage);
    expect(result.current.span).toBeUndefined();
    expect(mockFetchRootSpanByTraceId).toHaveBeenCalledTimes(1);
  });

  it('should refetch when traceId changes', async () => {
    const mockSpan1: TraceRootSpan = { duration: 1000 };
    const mockSpan2: TraceRootSpan = { duration: 2000 };
    mockFetchRootSpanByTraceId.mockResolvedValueOnce(mockSpan1).mockResolvedValueOnce(mockSpan2);

    const wrapper1 = ({ children }: { children: React.ReactNode }) => (
      <TraceRootSpanProvider traceId="trace-1">{children}</TraceRootSpanProvider>
    );
    const wrapper2 = ({ children }: { children: React.ReactNode }) => (
      <TraceRootSpanProvider traceId="trace-2">{children}</TraceRootSpanProvider>
    );

    const { result: result1 } = renderHook(() => useFetchTraceRootSpanContext(), {
      wrapper: wrapper1,
    });

    await waitFor(() => !result1.current.loading);
    expect(result1.current.span?.duration).toBe(1000);
    expect(mockFetchRootSpanByTraceId).toHaveBeenCalledWith(
      {
        traceId: 'trace-1',
        start: '2023-01-01T00:00:00.000Z',
        end: '2023-01-01T01:00:00.000Z',
      },
      expect.any(AbortSignal)
    );

    const { result: result2 } = renderHook(() => useFetchTraceRootSpanContext(), {
      wrapper: wrapper2,
    });

    await waitFor(() => !result2.current.loading);
    expect(result2.current.span?.duration).toBe(2000);
    expect(mockFetchRootSpanByTraceId).toHaveBeenCalledWith(
      {
        traceId: 'trace-2',
        start: '2023-01-01T00:00:00.000Z',
        end: '2023-01-01T01:00:00.000Z',
      },
      expect.any(AbortSignal)
    );
    expect(mockFetchRootSpanByTraceId).toHaveBeenCalledTimes(2);
  });

  it('should pass AbortSignal to fetchRootSpanByTraceId', async () => {
    mockFetchRootSpanByTraceId.mockImplementation(({ signal }: { signal: AbortSignal }) => {
      expect(signal).toBeInstanceOf(AbortSignal);
      return Promise.resolve({ duration: 1000 });
    });

    const { result } = renderHook(() => useFetchTraceRootSpanContext(), { wrapper });

    await waitFor(() => !result.current.loading);

    expect(mockFetchRootSpanByTraceId).toHaveBeenCalledWith(
      expect.objectContaining({
        traceId: 'test-trace',
        start: '2023-01-01T00:00:00.000Z',
        end: '2023-01-01T01:00:00.000Z',
      }),
      expect.any(AbortSignal)
    );
  });
});
