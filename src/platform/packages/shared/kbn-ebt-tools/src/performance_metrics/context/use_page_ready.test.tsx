/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V.
 * Licensed under the Elastic License 2.0 and other licenses.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { usePageReady } from './use_page_ready';

// We need to mock the PerformanceContext that the hook relies on so that we can
// verify that its callbacks are invoked.
const mockOnPageReady = jest.fn();
const mockOnPageRefreshStart = jest.fn();

jest.mock('../../..', () => ({
  usePerformanceContext: () => ({
    onPageReady: mockOnPageReady,
    onPageRefreshStart: mockOnPageRefreshStart,
  }),
}));

describe('usePageReady', () => {
  beforeEach(() => {
    mockOnPageReady.mockClear();
    mockOnPageRefreshStart.mockClear();
  });
  it('calls onPageReady on initial render when isReady is true', async () => {
    renderHook(() =>
      usePageReady({
        isReady: true,
        isRefreshing: false,
      })
    );

    await waitFor(() => expect(mockOnPageReady).toHaveBeenCalledTimes(1));
    expect(mockOnPageReady).toHaveBeenCalledWith({ customMetrics: undefined, meta: undefined });
  });

  it('passes customMetrics and meta to onPageReady', async () => {
    const customMetrics = { key1: 'counter', value1: 42 } as any;
    const meta = { rangeFrom: 'now-1h', rangeTo: 'now' } as any;

    renderHook(() =>
      usePageReady({
        isReady: true,
        isRefreshing: false,
        customMetrics,
        meta,
      })
    );

    await waitFor(() => expect(mockOnPageReady).toHaveBeenCalledTimes(1));
    expect(mockOnPageReady).toHaveBeenCalledWith({ customMetrics, meta });
  });

  it('does nothing when not ready', () => {
    renderHook(() =>
      usePageReady({
        isReady: false,
        isRefreshing: false,
      })
    );

    expect(mockOnPageReady).not.toHaveBeenCalled();
    expect(mockOnPageRefreshStart).not.toHaveBeenCalled();
  });

  it('triggers refresh start and ready events correctly', async () => {
    const { rerender } = renderHook(
      ({ ready, refreshing }) =>
        usePageReady({
          isReady: ready,
          isRefreshing: refreshing,
        }),
      { initialProps: { ready: true, refreshing: false } }
    );

    // initial ready
    await waitFor(() => expect(mockOnPageReady).toHaveBeenCalledTimes(1));

    // begin refresh
    rerender({ ready: true, refreshing: true });
    await waitFor(() => expect(mockOnPageRefreshStart).toHaveBeenCalledTimes(1));

    // end refresh
    rerender({ ready: true, refreshing: false });
    await waitFor(() => expect(mockOnPageReady).toHaveBeenCalledTimes(2));
  });

  it('uses external customInitialLoad flag', async () => {
    const external = { value: true, onInitialLoadReported: jest.fn() };

    const { rerender } = renderHook(
      ({ ready }) =>
        usePageReady({
          isReady: ready,
          isRefreshing: false,
          customInitialLoad: external,
        }),
      { initialProps: { ready: false } }
    );

    // still not ready
    expect(mockOnPageReady).not.toHaveBeenCalled();

    // turn ready true
    rerender({ ready: true });
    await waitFor(() => expect(mockOnPageReady).toHaveBeenCalledTimes(1));
    expect(external.onInitialLoadReported).toHaveBeenCalledTimes(1);
  });
});
