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
import { useSpanFlyoutData } from './use_span_flyout_data';

const mockUseFetchSpan = jest.fn();

jest.mock('../../hooks/use_fetch_span', () => ({
  useFetchSpan: (params: { spanId: string; traceId: string }) => mockUseFetchSpan(params),
}));

jest.mock('../../helpers/is_span', () => ({
  isSpanHit: jest.fn((hit) => {
    if (!hit) return false;
    return hit.flattened?.['span.id'] !== undefined;
  }),
}));

describe('useSpanFlyoutData', () => {
  const spanId = 'test-span-id';
  const traceId = 'test-trace-id';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return loading true when fetching span', () => {
    mockUseFetchSpan.mockReturnValue({
      span: undefined,
      loading: true,
      error: undefined,
    });

    const { result } = renderHook(() => useSpanFlyoutData({ spanId, traceId }));

    expect(result.current.loading).toBe(true);
    expect(result.current.hit).toBeNull();
    expect(result.current.error).toBeNull();
    expect(mockUseFetchSpan).toHaveBeenCalledWith({ spanId, traceId });
  });

  it('should return null hit when span is not available', async () => {
    mockUseFetchSpan.mockReturnValue({
      span: undefined,
      loading: false,
      error: undefined,
    });

    const { result } = renderHook(() => useSpanFlyoutData({ spanId, traceId }));

    await waitFor(() => !result.current.loading);

    expect(result.current.loading).toBe(false);
    expect(result.current.hit).toBeNull();
  });

  it('should return hit with correct structure when span is fetched', async () => {
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

    mockUseFetchSpan.mockReturnValue({
      span: mockSpan,
      loading: false,
      error: undefined,
    });

    const { result } = renderHook(() => useSpanFlyoutData({ spanId, traceId }));

    await waitFor(() => !result.current.loading);

    expect(result.current.loading).toBe(false);
    expect(result.current.hit).not.toBeNull();
    expect(result.current.hit?.id).toBe('test-id');
    expect(result.current.hit?.raw._index).toBe('traces-apm-*');
    expect(result.current.hit?.raw._id).toBe('test-id');
    expect(result.current.hit?.raw._source).toBe(mockSpan);
    expect(result.current.hit?.flattened).toBeDefined();
    expect(result.current.error).toBeNull();
  });

  it('should return "Span document" title when hit is a span', async () => {
    const mockSpan: UnifiedSpanDocument = {
      _id: 'test-id',
      _index: 'traces-apm-*',
      span: {
        id: spanId,
        name: 'test-span',
      },
    } as UnifiedSpanDocument;

    mockUseFetchSpan.mockReturnValue({
      span: mockSpan,
      loading: false,
      error: undefined,
    });

    const isSpanHitMock = jest.requireMock('../../helpers/is_span').isSpanHit;
    isSpanHitMock.mockReturnValue(true);

    const { result } = renderHook(() => useSpanFlyoutData({ spanId, traceId }));

    await waitFor(() => !result.current.loading);

    expect(result.current.title).toBe('Span document');
  });

  it('should return "Transaction document" title when hit is a transaction', async () => {
    const mockTransaction: UnifiedSpanDocument = {
      _id: 'test-id',
      _index: 'traces-apm-*',
      transaction: {
        id: 'transaction-id',
        name: 'test-transaction',
      },
    } as UnifiedSpanDocument;

    mockUseFetchSpan.mockReturnValue({
      span: mockTransaction,
      loading: false,
      error: undefined,
    });

    const isSpanHitMock = jest.requireMock('../../helpers/is_span').isSpanHit;
    isSpanHitMock.mockReturnValue(false);

    const { result } = renderHook(() => useSpanFlyoutData({ spanId, traceId }));

    await waitFor(() => !result.current.loading);

    expect(result.current.title).toBe('Transaction document');
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

    mockUseFetchSpan
      .mockReturnValueOnce({ span: mockSpan1, loading: false, error: undefined })
      .mockReturnValueOnce({ span: mockSpan2, loading: false, error: undefined });

    const { result, rerender } = renderHook(
      ({ sId, tId }: { sId: string; tId: string }) =>
        useSpanFlyoutData({ spanId: sId, traceId: tId }),
      {
        initialProps: { sId: 'span-1', tId: traceId },
      }
    );

    await waitFor(() => !result.current.loading);
    expect(result.current.hit?.id).toBe('span-1');

    rerender({ sId: 'span-2', tId: traceId });

    await waitFor(() => result.current.hit?.id === 'span-2');
    expect(result.current.hit?.id).toBe('span-2');
    expect(mockUseFetchSpan).toHaveBeenCalledWith({ spanId: 'span-2', traceId });
  });

  it('should refetch when traceId changes', async () => {
    const mockSpan: UnifiedSpanDocument = {
      _id: 'test-id',
      _index: 'traces-apm-*',
      span: { id: spanId, name: 'test-span' },
    } as UnifiedSpanDocument;

    mockUseFetchSpan.mockReturnValue({ span: mockSpan, loading: false, error: undefined });

    const { rerender } = renderHook(
      ({ sId, tId }: { sId: string; tId: string }) =>
        useSpanFlyoutData({ spanId: sId, traceId: tId }),
      {
        initialProps: { sId: spanId, tId: 'trace-1' },
      }
    );

    expect(mockUseFetchSpan).toHaveBeenCalledWith({ spanId, traceId: 'trace-1' });

    rerender({ sId: spanId, tId: 'trace-2' });

    expect(mockUseFetchSpan).toHaveBeenCalledWith({ spanId, traceId: 'trace-2' });
  });

  it('should memoize hit when span does not change', async () => {
    const mockSpan: UnifiedSpanDocument = {
      _id: 'test-id',
      _index: 'traces-apm-*',
      span: { id: spanId, name: 'test-span' },
    } as UnifiedSpanDocument;

    mockUseFetchSpan.mockReturnValue({ span: mockSpan, loading: false, error: undefined });

    const { result, rerender } = renderHook(() => useSpanFlyoutData({ spanId, traceId }));

    await waitFor(() => !result.current.loading);
    const firstHit = result.current.hit;

    rerender();

    expect(result.current.hit).toBe(firstHit);
  });

  it('should return error message when fetch fails', async () => {
    const errorMessage = 'Failed to fetch span';
    mockUseFetchSpan.mockReturnValue({
      span: undefined,
      loading: false,
      error: new Error(errorMessage),
    });

    const { result } = renderHook(() => useSpanFlyoutData({ spanId, traceId }));

    await waitFor(() => !result.current.loading);

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.hit).toBeNull();
  });
});
