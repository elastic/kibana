/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { lastValueFrom } from 'rxjs';
import { getUnifiedDocViewerServices } from '../../../../../../plugin';
import { RootSpanProvider, useRootSpanContext } from '.';
import { TRANSACTION_DURATION_FIELD, TRANSACTION_NAME_FIELD } from '@kbn/discover-utils';

jest.mock('../../../../../../plugin', () => ({
  getUnifiedDocViewerServices: jest.fn(),
}));

jest.mock('rxjs', () => {
  const originalModule = jest.requireActual('rxjs');
  return {
    ...originalModule,
    lastValueFrom: jest.fn(),
  };
});

const mockSearch = jest.fn();
const mockAddDanger = jest.fn();
(getUnifiedDocViewerServices as jest.Mock).mockReturnValue({
  data: {
    search: {
      search: mockSearch,
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

const lastValueFromMock = lastValueFrom as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  lastValueFromMock.mockReset();
});

describe('useRootSpan hook', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <RootSpanProvider traceId="test-trace" transactionId="transaction-id" indexPattern="test-index">
      {children}
    </RootSpanProvider>
  );

  it('should start with loading true and trace as null', async () => {
    lastValueFromMock.mockResolvedValue({});

    const { result } = renderHook(() => useRootSpanContext(), { wrapper });

    expect(result.current.loading).toBe(true);
    expect(lastValueFrom).toHaveBeenCalledTimes(1);
  });

  it('should update trace when data is fetched successfully', async () => {
    const transactionName = 'Test Trace';
    const transactionDuration = 1;
    lastValueFromMock.mockResolvedValue({
      rawResponse: {
        hits: {
          hits: [
            {
              fields: {
                [TRANSACTION_NAME_FIELD]: transactionName,
                [TRANSACTION_DURATION_FIELD]: transactionDuration,
              },
            },
          ],
        },
      },
    });

    const { result } = renderHook(() => useRootSpanContext(), { wrapper });

    await waitFor(() => !result.current.loading);

    expect(result.current.loading).toBe(false);
    expect(result.current.trace?.name).toBe(transactionName);
    expect(result.current.trace?.duration).toBe(transactionDuration);
    expect(lastValueFrom).toHaveBeenCalledTimes(1);
  });

  it('should update trace when OTEL data is fetched successfully', async () => {
    const newWrapper = ({ children }: { children: React.ReactNode }) => (
      <RootSpanProvider traceId="test-trace" indexPattern="test-index">
        {children}
      </RootSpanProvider>
    );

    const transactionName = 'Test Trace';
    const transactionDuration = 1;
    lastValueFromMock.mockResolvedValue({
      rawResponse: {
        hits: {
          hits: [
            {
              fields: {
                [TRANSACTION_NAME_FIELD]: transactionName,
                [TRANSACTION_DURATION_FIELD]: transactionDuration,
              },
            },
          ],
        },
      },
    });

    const { result } = renderHook(() => useRootSpanContext(), { wrapper: newWrapper });

    await waitFor(() => !result.current.loading);

    expect(result.current.loading).toBe(false);
    expect(result.current.trace?.name).toBe(transactionName);
    expect(result.current.trace?.duration).toBe(transactionDuration);
    expect(lastValueFrom).toHaveBeenCalledTimes(1);
  });

  it('should handle errors and set trace to null, and show a toast error', async () => {
    const errorMessage = 'Search error';
    lastValueFromMock.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useRootSpanContext(), { wrapper });

    await waitFor(() => !result.current.loading);

    expect(result.current.loading).toBe(false);
    expect(result.current.trace).toBeNull();
    expect(lastValueFrom).toHaveBeenCalledTimes(1);
    expect(mockAddDanger).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'An error occurred while fetching the trace',
        text: errorMessage,
      })
    );
  });

  it('should set trace to null and stop loading when traceId is not provided', async () => {
    const wrapperWithoutTraceId = ({ children }: { children: React.ReactNode }) => (
      <RootSpanProvider traceId={undefined} indexPattern="test-index">
        {children}
      </RootSpanProvider>
    );

    const { result } = renderHook(() => useRootSpanContext(), {
      wrapper: wrapperWithoutTraceId,
    });

    await waitFor(() => !result.current.loading);

    expect(result.current.loading).toBe(false);
    expect(result.current.trace).toBeNull();
    expect(lastValueFrom).not.toHaveBeenCalled();
  });
});
