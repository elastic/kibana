/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, waitFor } from '@testing-library/react';
import type { UnifiedSpanDocument } from '@kbn/apm-types';
import { useFetchSpan } from '.';
import { getUnifiedDocViewerServices } from '../../../../../../../plugin';

jest.mock('../../../../../../../plugin', () => ({
  getUnifiedDocViewerServices: jest.fn(),
}));

const mockFetchSpan = jest.fn<Promise<UnifiedSpanDocument | undefined>, any>();
const mockAddDanger = jest.fn();
const mockGetAbsoluteTime = jest.fn(() => ({
  from: '2023-01-01T00:00:00.000Z',
  to: '2023-01-01T01:00:00.000Z',
}));

const mockGetById: jest.Mock<
  | {
      fetchSpan: jest.Mock<Promise<UnifiedSpanDocument | undefined>>;
    }
  | undefined
> = jest.fn(() => ({
  fetchSpan: mockFetchSpan,
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
  core: {
    notifications: {
      toasts: {
        addDanger: mockAddDanger,
      },
    },
  },
});

describe('useFetchSpan', () => {
  const spanId = 'test-span-id';
  const traceId = 'test-trace-id';

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetById.mockReturnValue({
      fetchSpan: mockFetchSpan,
    });
    mockAddDanger.mockClear();
  });

  it('should return undefined when feature is not registered', async () => {
    mockGetById.mockReturnValue(undefined);

    const { result } = renderHook(() => useFetchSpan({ spanId, traceId }));

    await waitFor(() => !result.current.loading);

    expect(result.current.loading).toBe(false);
    expect(result.current.span).toBeUndefined();
    expect(mockFetchSpan).not.toHaveBeenCalled();
  });

  it('should return undefined when spanId is empty', async () => {
    const { result } = renderHook(() => useFetchSpan({ spanId: '', traceId }));

    await waitFor(() => !result.current.loading);

    expect(result.current.loading).toBe(false);
    expect(result.current.span).toBeUndefined();
    expect(mockFetchSpan).not.toHaveBeenCalled();
  });

  it('should return undefined when traceId is empty', async () => {
    const { result } = renderHook(() => useFetchSpan({ spanId, traceId: '' }));

    await waitFor(() => !result.current.loading);

    expect(result.current.loading).toBe(false);
    expect(result.current.span).toBeUndefined();
    expect(mockFetchSpan).not.toHaveBeenCalled();
  });

  it('should start with loading true and span as undefined', async () => {
    mockFetchSpan.mockImplementation(
      () => new Promise(() => {}) // Never resolves to keep loading
    );

    const { result } = renderHook(() => useFetchSpan({ spanId, traceId }));

    expect(result.current.loading).toBe(true);
    expect(result.current.span).toBeUndefined();
    expect(mockFetchSpan).toHaveBeenCalledWith(
      {
        traceId,
        spanId,
        start: '2023-01-01T00:00:00.000Z',
        end: '2023-01-01T01:00:00.000Z',
      },
      expect.any(AbortSignal)
    );
  });

  it('should update span when data is fetched successfully', async () => {
    const mockSpan: UnifiedSpanDocument = {
      _id: 'test-id',
      _index: 'traces-apm-*',
      span: {
        id: spanId,
        name: 'test-span',
        duration: { us: 100000 },
      },
      trace: { id: traceId },
      service: { name: 'test-service' },
    } as UnifiedSpanDocument;

    mockFetchSpan.mockResolvedValue(mockSpan);

    const { result } = renderHook(() => useFetchSpan({ spanId, traceId }));

    await waitFor(() => !result.current.loading);

    expect(result.current.loading).toBe(false);
    expect(result.current.span).toEqual(mockSpan);
    expect(mockFetchSpan).toHaveBeenCalledWith(
      {
        traceId,
        spanId,
        start: '2023-01-01T00:00:00.000Z',
        end: '2023-01-01T01:00:00.000Z',
      },
      expect.any(AbortSignal)
    );
  });

  it('should handle when span is not found (returns undefined)', async () => {
    mockFetchSpan.mockResolvedValue(undefined);

    const { result } = renderHook(() => useFetchSpan({ spanId, traceId }));

    await waitFor(() => !result.current.loading);

    expect(result.current.loading).toBe(false);
    expect(result.current.span).toBeUndefined();
    expect(mockFetchSpan).toHaveBeenCalledTimes(1);
  });

  it('should handle errors and set error state', async () => {
    const errorMessage = 'Fetch error';
    mockFetchSpan.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useFetchSpan({ spanId, traceId }));

    await waitFor(() => !result.current.loading);

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe(errorMessage);
    expect(result.current.span).toBeUndefined();
    expect(mockFetchSpan).toHaveBeenCalledTimes(1);
  });

  it('should show toast notification when an error occurs', async () => {
    const errorMessage = 'Fetch error';
    mockFetchSpan.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useFetchSpan({ spanId, traceId }));

    await waitFor(() => !result.current.loading);

    await waitFor(() => {
      expect(mockAddDanger).toHaveBeenCalledWith({
        title: 'An error occurred while fetching the span document',
        text: errorMessage,
      });
    });
  });

  it('should refetch when spanId changes', async () => {
    const mockSpan1: UnifiedSpanDocument = {
      _id: 'span-1',
      _index: 'traces-apm-*',
      span: { id: 'span-1', name: 'span-1' },
    } as UnifiedSpanDocument;
    const mockSpan2: UnifiedSpanDocument = {
      _id: 'span-2',
      _index: 'traces-apm-*',
      span: { id: 'span-2', name: 'span-2' },
    } as UnifiedSpanDocument;

    mockFetchSpan.mockResolvedValueOnce(mockSpan1).mockResolvedValueOnce(mockSpan2);

    const { result, rerender } = renderHook(
      ({ sId, tId }: { sId: string; tId: string }) => useFetchSpan({ spanId: sId, traceId: tId }),
      {
        initialProps: { sId: 'span-1', tId: traceId },
      }
    );

    await waitFor(() => !result.current.loading);
    expect(result.current.span?._id).toBe('span-1');
    expect(mockFetchSpan).toHaveBeenCalledWith(
      {
        traceId,
        spanId: 'span-1',
        start: '2023-01-01T00:00:00.000Z',
        end: '2023-01-01T01:00:00.000Z',
      },
      expect.any(AbortSignal)
    );

    rerender({ sId: 'span-2', tId: traceId });

    await waitFor(() => !result.current.loading);
    expect(result.current.span?._id).toBe('span-2');
    expect(mockFetchSpan).toHaveBeenCalledWith(
      {
        traceId,
        spanId: 'span-2',
        start: '2023-01-01T00:00:00.000Z',
        end: '2023-01-01T01:00:00.000Z',
      },
      expect.any(AbortSignal)
    );
    expect(mockFetchSpan).toHaveBeenCalledTimes(2);
  });

  it('should refetch when traceId changes', async () => {
    const mockSpan: UnifiedSpanDocument = {
      _id: 'test-id',
      _index: 'traces-apm-*',
      span: { id: spanId, name: 'test-span' },
    } as UnifiedSpanDocument;

    mockFetchSpan.mockResolvedValue(mockSpan);

    const { result, rerender } = renderHook(
      ({ sId, tId }: { sId: string; tId: string }) => useFetchSpan({ spanId: sId, traceId: tId }),
      {
        initialProps: { sId: spanId, tId: 'trace-1' },
      }
    );

    await waitFor(() => !result.current.loading);
    expect(mockFetchSpan).toHaveBeenCalledWith(
      {
        traceId: 'trace-1',
        spanId,
        start: '2023-01-01T00:00:00.000Z',
        end: '2023-01-01T01:00:00.000Z',
      },
      expect.any(AbortSignal)
    );

    rerender({ sId: spanId, tId: 'trace-2' });

    await waitFor(() => !result.current.loading);
    expect(mockFetchSpan).toHaveBeenCalledWith(
      {
        traceId: 'trace-2',
        spanId,
        start: '2023-01-01T00:00:00.000Z',
        end: '2023-01-01T01:00:00.000Z',
      },
      expect.any(AbortSignal)
    );
    expect(mockFetchSpan).toHaveBeenCalledTimes(2);
  });

  it('should pass AbortSignal to fetchSpan', async () => {
    const mockSpan: UnifiedSpanDocument = {
      _id: 'test-id',
      _index: 'traces-apm-*',
      span: { id: spanId, name: 'test-span' },
    } as UnifiedSpanDocument;

    mockFetchSpan.mockImplementation(({ signal }: { signal: AbortSignal }) => {
      expect(signal).toBeInstanceOf(AbortSignal);
      return Promise.resolve(mockSpan);
    });

    const { result } = renderHook(() => useFetchSpan({ spanId, traceId }));

    await waitFor(() => !result.current.loading);

    expect(mockFetchSpan).toHaveBeenCalledWith(
      expect.objectContaining({
        traceId,
        spanId,
        start: '2023-01-01T00:00:00.000Z',
        end: '2023-01-01T01:00:00.000Z',
      }),
      expect.any(AbortSignal)
    );
  });
});
