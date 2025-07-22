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
import { RootTransactionProvider, useRootTransactionContext } from '.';
import {
  SERVICE_NAME_FIELD,
  SPAN_ID_FIELD,
  TRANSACTION_DURATION_FIELD,
  TRANSACTION_ID_FIELD,
  TRANSACTION_NAME_FIELD,
} from '@kbn/discover-utils';

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

describe('useRootTransaction hook', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <RootTransactionProvider traceId="test-trace" indexPattern="test-index">
      {children}
    </RootTransactionProvider>
  );

  it('should start with loading true and transaction as null', async () => {
    lastValueFromMock.mockResolvedValue({});

    const { result } = renderHook(() => useRootTransactionContext(), { wrapper });

    expect(result.current.loading).toBe(true);
    expect(lastValueFrom).toHaveBeenCalledTimes(1);
  });

  it('should update transaction when data is fetched successfully', async () => {
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
                [TRANSACTION_NAME_FIELD]: transactionName,
                [TRANSACTION_DURATION_FIELD]: transactionDuration,
                [SPAN_ID_FIELD]: spanId,
                [TRANSACTION_ID_FIELD]: transactionId,
                [SERVICE_NAME_FIELD]: serviceName,
              },
            },
          ],
        },
      },
    });

    const { result } = renderHook(() => useRootTransactionContext(), { wrapper });

    await waitFor(() => !result.current.loading);

    expect(result.current.loading).toBe(false);
    expect(result.current.transaction?.duration).toBe(transactionDuration);
    expect(result.current.transaction?.[SPAN_ID_FIELD]).toBe(spanId);
    expect(result.current.transaction?.[TRANSACTION_ID_FIELD]).toBe(transactionId);
    expect(result.current.transaction?.[SERVICE_NAME_FIELD]).toBe(serviceName);
    expect(lastValueFrom).toHaveBeenCalledTimes(1);
  });

  it('should handle errors and set transaction to null, and show a toast error', async () => {
    const errorMessage = 'Search error';
    lastValueFromMock.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useRootTransactionContext(), { wrapper });

    await waitFor(() => !result.current.loading);

    expect(result.current.loading).toBe(false);
    expect(result.current.transaction).toBeNull();
    expect(lastValueFrom).toHaveBeenCalledTimes(1);
    expect(mockAddDanger).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'An error occurred while fetching the transaction',
        text: errorMessage,
      })
    );
  });
});
