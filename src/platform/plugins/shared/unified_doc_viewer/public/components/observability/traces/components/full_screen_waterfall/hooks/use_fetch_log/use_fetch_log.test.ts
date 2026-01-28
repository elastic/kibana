/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useFetchLog } from '.';
import { getUnifiedDocViewerServices } from '../../../../../../../plugin';

jest.mock('../../../../../../../plugin', () => ({
  getUnifiedDocViewerServices: jest.fn(),
}));

const mockFetchLogDocumentById = jest.fn<
  Promise<
    | {
        _index: string;
        fields: Record<PropertyKey, any> | undefined;
      }
    | undefined
  >,
  any
>();
const mockAddDanger = jest.fn();

const mockGetById: jest.Mock<
  | {
      fetchLogDocumentById: jest.Mock<
        Promise<
          | {
              _index: string;
              fields: Record<PropertyKey, any> | undefined;
            }
          | undefined
        >
      >;
    }
  | undefined
> = jest.fn(() => ({
  fetchLogDocumentById: mockFetchLogDocumentById,
}));

(getUnifiedDocViewerServices as jest.Mock).mockReturnValue({
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

describe('useFetchLog', () => {
  const id = 'test-log-id';
  const index = 'remote_cluster:.ds-logs-apm.error-default-2026.01.14-000054';

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetById.mockReturnValue({
      fetchLogDocumentById: mockFetchLogDocumentById,
    });
    mockAddDanger.mockClear();
  });

  it('should return undefined when feature is not registered', async () => {
    mockGetById.mockReturnValue(undefined);

    const { result } = renderHook(() => useFetchLog({ id, index }));

    await waitFor(() => !result.current.loading);

    expect(result.current.loading).toBe(false);
    expect(result.current.log).toBeUndefined();
    expect(result.current.index).toBeUndefined();
    expect(mockFetchLogDocumentById).not.toHaveBeenCalled();
  });

  it('should return undefined when id is empty', async () => {
    const { result } = renderHook(() => useFetchLog({ id: '' }));

    await waitFor(() => !result.current.loading);

    expect(result.current.loading).toBe(false);
    expect(result.current.log).toBeUndefined();
    expect(result.current.index).toBeUndefined();
    expect(mockFetchLogDocumentById).not.toHaveBeenCalled();
  });

  it('should start with loading true and log/index as undefined', async () => {
    mockFetchLogDocumentById.mockImplementation(
      () => new Promise(() => {}) // Never resolves to keep loading
    );

    const { result } = renderHook(() => useFetchLog({ id }));

    expect(result.current.loading).toBe(true);
    expect(result.current.log).toBeUndefined();
    expect(result.current.index).toBeUndefined();
    expect(mockFetchLogDocumentById).toHaveBeenCalledWith(
      {
        id,
      },
      expect.any(AbortSignal)
    );
  });

  it('should pass index when provided', async () => {
    mockFetchLogDocumentById.mockImplementation(() => new Promise(() => {})); // keep loading

    renderHook(() => useFetchLog({ id, index }));

    expect(mockFetchLogDocumentById).toHaveBeenCalledWith(
      {
        id,
        index,
      },
      expect.any(AbortSignal)
    );
  });

  it('should update log and index when data is fetched successfully', async () => {
    const mockLogData = {
      _index: 'logs-*',
      fields: {
        message: 'test log message',
        '@timestamp': '2023-01-01T00:00:00.000Z',
      },
    };

    mockFetchLogDocumentById.mockResolvedValue(mockLogData);

    const { result } = renderHook(() => useFetchLog({ id }));

    await waitFor(() => !result.current.loading);

    expect(result.current.loading).toBe(false);
    expect(result.current.log).toEqual(mockLogData.fields);
    expect(result.current.index).toBe(mockLogData._index);
    expect(mockFetchLogDocumentById).toHaveBeenCalledWith(
      {
        id,
      },
      expect.any(AbortSignal)
    );
  });

  it('should handle when log document is not found (returns undefined)', async () => {
    mockFetchLogDocumentById.mockResolvedValue(undefined);

    const { result } = renderHook(() => useFetchLog({ id }));

    await waitFor(() => !result.current.loading);

    expect(result.current.loading).toBe(false);
    expect(result.current.log).toBeUndefined();
    expect(result.current.index).toBeUndefined();
    expect(mockFetchLogDocumentById).toHaveBeenCalledTimes(1);
  });

  it('should handle when log document has undefined fields', async () => {
    const mockLogData = {
      _index: 'logs-*',
      fields: undefined,
    };

    mockFetchLogDocumentById.mockResolvedValue(mockLogData);

    const { result } = renderHook(() => useFetchLog({ id }));

    await waitFor(() => !result.current.loading);

    expect(result.current.loading).toBe(false);
    expect(result.current.log).toBeUndefined();
    expect(result.current.index).toBe('logs-*');
    expect(mockFetchLogDocumentById).toHaveBeenCalledTimes(1);
  });

  it('should handle errors and return undefined values', async () => {
    const errorMessage = 'Fetch error';
    mockFetchLogDocumentById.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useFetchLog({ id }));

    await waitFor(() => !result.current.loading);

    expect(result.current.loading).toBe(false);
    expect(result.current.log).toBeUndefined();
    expect(result.current.index).toBeUndefined();
    expect(mockFetchLogDocumentById).toHaveBeenCalledTimes(1);
  });

  it('should show toast notification when an error occurs', async () => {
    const errorMessage = 'Fetch error';
    mockFetchLogDocumentById.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useFetchLog({ id }));

    await waitFor(() => !result.current.loading);

    await waitFor(() => {
      expect(mockAddDanger).toHaveBeenCalledWith({
        title: 'An error occurred while fetching the log document',
        text: errorMessage,
      });
    });
  });

  it('should show toast notification when error is a string', async () => {
    const errorMessage = 'String error';
    mockFetchLogDocumentById.mockRejectedValue(errorMessage);

    const { result } = renderHook(() => useFetchLog({ id }));

    await waitFor(() => !result.current.loading);

    await waitFor(() => {
      expect(mockAddDanger).toHaveBeenCalledWith({
        title: 'An error occurred while fetching the log document',
        text: errorMessage,
      });
    });
  });

  it('should refetch when id changes', async () => {
    const mockLogData1 = {
      _index: 'logs-*',
      fields: { message: 'log 1' },
    };
    const mockLogData2 = {
      _index: 'logs-*',
      fields: { message: 'log 2' },
    };

    mockFetchLogDocumentById
      .mockResolvedValueOnce(mockLogData1)
      .mockResolvedValueOnce(mockLogData2);

    const { result, rerender } = renderHook(
      ({ logId }: { logId: string }) => useFetchLog({ id: logId, index }),
      {
        initialProps: { logId: 'log-1' },
      }
    );

    await waitFor(() => !result.current.loading);
    expect(result.current.log?.message).toBe('log 1');
    expect(mockFetchLogDocumentById).toHaveBeenCalledWith(
      {
        id: 'log-1',
        index,
      },
      expect.any(AbortSignal)
    );

    rerender({ logId: 'log-2' });

    await waitFor(() => !result.current.loading);
    expect(result.current.log?.message).toBe('log 2');
    expect(mockFetchLogDocumentById).toHaveBeenCalledWith(
      {
        id: 'log-2',
        index,
      },
      expect.any(AbortSignal)
    );
    expect(mockFetchLogDocumentById).toHaveBeenCalledTimes(2);
  });

  it('should pass AbortSignal to fetchLogDocumentById', async () => {
    const mockLogData = {
      _index: 'logs-*',
      fields: { message: 'test' },
    };

    mockFetchLogDocumentById.mockImplementation(({ signal }: { signal: AbortSignal }) => {
      expect(signal).toBeInstanceOf(AbortSignal);
      return Promise.resolve(mockLogData);
    });

    const { result } = renderHook(() => useFetchLog({ id }));

    await waitFor(() => !result.current.loading);

    expect(mockFetchLogDocumentById).toHaveBeenCalledWith(
      expect.objectContaining({
        id,
      }),
      expect.any(AbortSignal)
    );
  });
});
