/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useLogFlyoutData } from './use_log_flyout_data';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';

const mockUseFetchLog = jest.fn();
const mockUseAdhocDataView = jest.fn();

jest.mock('../../hooks/use_fetch_log', () => ({
  useFetchLog: (params: { id: string; index?: string }) => mockUseFetchLog(params),
}));

jest.mock('../../hooks/use_adhoc_data_view', () => ({
  useAdhocDataView: (params: { index: string | null }) => mockUseAdhocDataView(params),
}));

describe('useLogFlyoutData', () => {
  const id = 'test-log-id';
  const index = 'logs-*';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return loading true when fetching log', () => {
    mockUseFetchLog.mockReturnValue({
      loading: true,
      log: undefined,
      index: undefined,
    });
    mockUseAdhocDataView.mockReturnValue({
      dataView: null,
      error: null,
      loading: false,
    });

    const { result } = renderHook(() => useLogFlyoutData({ id }));

    expect(result.current.loading).toBe(true);
    expect(result.current.hit).toBeNull();
    expect(mockUseFetchLog).toHaveBeenCalledWith({ id });
  });

  it('should return loading true when fetching data view', () => {
    mockUseFetchLog.mockReturnValue({
      loading: false,
      log: { message: 'test' },
      index: 'logs-*',
    });
    mockUseAdhocDataView.mockReturnValue({
      dataView: null,
      error: null,
      loading: true,
    });

    const { result } = renderHook(() => useLogFlyoutData({ id }));

    expect(result.current.loading).toBe(true);
  });

  it('should return loading true when both are loading', () => {
    mockUseFetchLog.mockReturnValue({
      loading: true,
      log: undefined,
      index: undefined,
    });
    mockUseAdhocDataView.mockReturnValue({
      dataView: null,
      error: null,
      loading: true,
    });

    const { result } = renderHook(() => useLogFlyoutData({ id }));

    expect(result.current.loading).toBe(true);
  });

  it('should return null hit when log is not available', async () => {
    mockUseFetchLog.mockReturnValue({
      loading: false,
      log: undefined,
      index: undefined,
    });
    mockUseAdhocDataView.mockReturnValue({
      dataView: null,
      error: null,
      loading: false,
    });

    const { result } = renderHook(() => useLogFlyoutData({ id }));

    await waitFor(() => !result.current.loading);

    expect(result.current.loading).toBe(false);
    expect(result.current.hit).toBeNull();
  });

  it('should return null hit when id is empty', async () => {
    mockUseFetchLog.mockReturnValue({
      loading: false,
      log: { message: 'test' },
      index: 'logs-*',
    });
    mockUseAdhocDataView.mockReturnValue({
      dataView: dataViewMock,
      error: null,
      loading: false,
    });

    const { result } = renderHook(() => useLogFlyoutData({ id: '' }));

    await waitFor(() => !result.current.loading);

    expect(result.current.hit).toBeNull();
  });

  it('should return null hit when resolvedIndex is not available', async () => {
    mockUseFetchLog.mockReturnValue({
      loading: false,
      log: { message: 'test' },
      index: undefined,
    });
    mockUseAdhocDataView.mockReturnValue({
      dataView: null,
      error: null,
      loading: false,
    });

    const { result } = renderHook(() => useLogFlyoutData({ id }));

    await waitFor(() => !result.current.loading);

    expect(result.current.hit).toBeNull();
  });

  it('should return hit with correct structure when log is fetched', async () => {
    const mockLog = {
      message: 'test log message',
      '@timestamp': '2023-01-01T00:00:00.000Z',
    };
    const resolvedIndex = 'logs-2023.01.01';

    mockUseFetchLog.mockReturnValue({
      loading: false,
      log: mockLog,
      index: resolvedIndex,
    });
    mockUseAdhocDataView.mockReturnValue({
      dataView: dataViewMock,
      error: null,
      loading: false,
    });

    const { result } = renderHook(() => useLogFlyoutData({ id }));

    await waitFor(() => !result.current.loading);

    expect(result.current.loading).toBe(false);
    expect(result.current.hit).not.toBeNull();
    expect(result.current.hit?.id).toBe(id);
    expect(result.current.hit?.raw._index).toBe(resolvedIndex);
    expect(result.current.hit?.raw._id).toBe(id);
    expect(result.current.hit?.raw._source).toBe(mockLog);
    expect(result.current.hit?.flattened).toBeDefined();
  });

  it('should return "Log document" title', async () => {
    mockUseFetchLog.mockReturnValue({
      loading: false,
      log: { message: 'test' },
      index: 'logs-*',
    });
    mockUseAdhocDataView.mockReturnValue({
      dataView: dataViewMock,
      error: null,
      loading: false,
    });

    const { result } = renderHook(() => useLogFlyoutData({ id }));

    await waitFor(() => !result.current.loading);

    expect(result.current.title).toBe('Log document');
  });

  it('should return error from adhoc data view', async () => {
    const errorMessage = 'Failed to create data view';

    mockUseFetchLog.mockReturnValue({
      loading: false,
      log: { message: 'test' },
      index: 'logs-*',
    });
    mockUseAdhocDataView.mockReturnValue({
      dataView: null,
      error: errorMessage,
      loading: false,
    });

    const { result } = renderHook(() => useLogFlyoutData({ id }));

    await waitFor(() => !result.current.loading);

    expect(result.current.error).toBe(errorMessage);
  });

  it('should return logDataView from adhoc data view', async () => {
    mockUseFetchLog.mockReturnValue({
      loading: false,
      log: { message: 'test' },
      index: 'logs-*',
    });
    mockUseAdhocDataView.mockReturnValue({
      dataView: dataViewMock,
      error: null,
      loading: false,
    });

    const { result } = renderHook(() => useLogFlyoutData({ id }));

    await waitFor(() => !result.current.loading);

    expect(result.current.logDataView).toBe(dataViewMock);
  });

  it('should pass index to useFetchLog when provided', () => {
    mockUseFetchLog.mockReturnValue({
      loading: true,
      log: undefined,
      index: undefined,
    });
    mockUseAdhocDataView.mockReturnValue({
      dataView: null,
      error: null,
      loading: false,
    });

    renderHook(() => useLogFlyoutData({ id, index }));

    expect(mockUseFetchLog).toHaveBeenCalledWith({ id, index });
  });

  it('should pass resolvedIndex to useAdhocDataView', () => {
    const resolvedIndex = 'logs-2023.01.01';

    mockUseFetchLog.mockReturnValue({
      loading: false,
      log: { message: 'test' },
      index: resolvedIndex,
    });
    mockUseAdhocDataView.mockReturnValue({
      dataView: dataViewMock,
      error: null,
      loading: false,
    });

    renderHook(() => useLogFlyoutData({ id }));

    expect(mockUseAdhocDataView).toHaveBeenCalledWith({ index: resolvedIndex });
  });

  it('should pass null to useAdhocDataView when resolvedIndex is undefined', () => {
    mockUseFetchLog.mockReturnValue({
      loading: false,
      log: undefined,
      index: undefined,
    });
    mockUseAdhocDataView.mockReturnValue({
      dataView: null,
      error: null,
      loading: false,
    });

    renderHook(() => useLogFlyoutData({ id }));

    expect(mockUseAdhocDataView).toHaveBeenCalledWith({ index: null });
  });

  it('should refetch when id changes', async () => {
    const mockLog1 = { message: 'log 1' };
    const mockLog2 = { message: 'log 2' };

    mockUseFetchLog
      .mockReturnValueOnce({ loading: false, log: mockLog1, index: 'logs-*' })
      .mockReturnValueOnce({ loading: false, log: mockLog2, index: 'logs-*' });
    mockUseAdhocDataView.mockReturnValue({
      dataView: dataViewMock,
      error: null,
      loading: false,
    });

    const { result, rerender } = renderHook(
      ({ logId }: { logId: string }) => useLogFlyoutData({ id: logId }),
      {
        initialProps: { logId: 'log-1' },
      }
    );

    await waitFor(() => !result.current.loading);
    expect(result.current.hit?.raw._source).toBe(mockLog1);
    expect(mockUseFetchLog).toHaveBeenCalledWith({ id: 'log-1' });

    rerender({ logId: 'log-2' });

    expect(mockUseFetchLog).toHaveBeenCalledWith({ id: 'log-2' });
  });

  it('should memoize hit when log does not change', async () => {
    const mockLog = { message: 'test' };
    const resolvedIndex = 'logs-*';

    mockUseFetchLog.mockReturnValue({
      loading: false,
      log: mockLog,
      index: resolvedIndex,
    });
    mockUseAdhocDataView.mockReturnValue({
      dataView: dataViewMock,
      error: null,
      loading: false,
    });

    const { result, rerender } = renderHook(() => useLogFlyoutData({ id }));

    await waitFor(() => !result.current.loading);
    const firstHit = result.current.hit;

    rerender();

    expect(result.current.hit).toBe(firstHit);
  });
});
