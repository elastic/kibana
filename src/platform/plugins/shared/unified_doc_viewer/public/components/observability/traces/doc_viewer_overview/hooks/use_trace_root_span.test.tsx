/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { lastValueFrom } from 'rxjs';
import {
  SERVICE_NAME,
  SPAN_ID,
  TRANSACTION_DURATION,
  TRANSACTION_ID,
  TRANSACTION_NAME,
} from '@kbn/apm-types';
import { waitFor } from '@testing-library/dom';
import { renderHook } from '@testing-library/react';
import { getUnifiedDocViewerServices } from '../../../../../plugin';
import { TraceRootSpanProvider, useTraceRootSpanContext } from './use_trace_root_span';

jest.mock('../../../../../plugin', () => ({
  getUnifiedDocViewerServices: jest.fn(),
}));

jest.mock('rxjs', () => {
  const originalModule = jest.requireActual('rxjs');
  return {
    ...originalModule,
    lastValueFrom: jest.fn(),
  };
});

jest.mock('../../hooks/use_data_sources', () => ({
  useDataSourcesContext: () => ({
    indexes: { apm: { traces: 'test-index' } },
  }),
}));

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

describe('useTraceRootSpan hook', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <TraceRootSpanProvider traceId="test-trace">{children}</TraceRootSpanProvider>
  );

  it('should start with loading true and span as null', async () => {
    lastValueFromMock.mockResolvedValue({});

    const { result } = renderHook(() => useTraceRootSpanContext(), { wrapper });

    expect(result.current.loading).toBe(true);
    expect(lastValueFrom).toHaveBeenCalledTimes(1);
  });

  it('should update span when data is fetched successfully', async () => {
    const transactionName = 'Test Transaction';
    const transactionDuration = 1;
    const spanId = 'spanId';
    const transactionId = 'transactionId';
    const serviceName = 'serviceName';
    lastValueFromMock.mockResolvedValue({
      rawResponse: {
        hits: {
          hits: [
            {
              fields: {
                [TRANSACTION_NAME]: transactionName,
                [TRANSACTION_DURATION]: transactionDuration,
                [SPAN_ID]: spanId,
                [TRANSACTION_ID]: transactionId,
                [SERVICE_NAME]: serviceName,
              },
            },
          ],
        },
      },
    });

    const { result } = renderHook(() => useTraceRootSpanContext(), { wrapper });

    await waitFor(() => !result.current.loading);

    expect(result.current.loading).toBe(false);
    expect(result.current.span?.duration).toBe(transactionDuration);
    expect(result.current.span?.[SPAN_ID]).toBe(spanId);
    expect(result.current.span?.[TRANSACTION_ID]).toBe(transactionId);
    expect(result.current.span?.[SERVICE_NAME]).toBe(serviceName);
    expect(lastValueFrom).toHaveBeenCalledTimes(1);
  });

  it('should handle errors and set transaction to null, and show a toast error', async () => {
    const errorMessage = 'Search error';
    lastValueFromMock.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useTraceRootSpanContext(), { wrapper });

    await waitFor(() => !result.current.loading);

    expect(result.current.loading).toBe(false);
    expect(result.current.span).toBeNull();
    expect(lastValueFrom).toHaveBeenCalledTimes(1);
    expect(mockAddDanger).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'An error occurred while fetching the transaction',
        text: errorMessage,
      })
    );
  });
});
