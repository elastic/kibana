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
import { getUnifiedDocViewerServices } from '../plugin';
import { TransactionProvider, useTransactionContext } from './use_transaction';

jest.mock('../plugin', () => ({
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
(getUnifiedDocViewerServices as jest.Mock).mockReturnValue({
  data: {
    search: {
      search: mockSearch,
    },
  },
});

beforeEach(() => {
  jest.clearAllMocks();
  (lastValueFrom as jest.Mock).mockReset();
});

describe('useTransaction hook', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <TransactionProvider traceId="test-trace" indexPattern="test-index">
      {children}
    </TransactionProvider>
  );

  it('should start with loading true and transaction as null', async () => {
    (lastValueFrom as jest.Mock).mockResolvedValue({});

    const { result } = renderHook(() => useTransactionContext(), { wrapper });

    expect(result.current.loading).toBe(true);
    expect(lastValueFrom).toHaveBeenCalledTimes(1);
  });

  it('should update transaction when data is fetched successfully', async () => {
    const transactionName = 'Test Transaction';
    (lastValueFrom as jest.Mock).mockResolvedValue({
      rawResponse: {
        hits: {
          hits: [{ _source: { transaction: { name: transactionName } } }],
        },
      },
    });

    const { result } = renderHook(() => useTransactionContext(), { wrapper });

    await waitFor(() => !result.current.loading);

    expect(result.current.loading).toBe(false);
    expect(result.current.transaction?.name).toBe(transactionName);
    expect(lastValueFrom).toHaveBeenCalledTimes(1);
  });

  it('should handle errors and set transaction.name as empty string', async () => {
    (lastValueFrom as jest.Mock).mockResolvedValue(new Error('Search error'));

    const { result } = renderHook(() => useTransactionContext(), { wrapper });

    await waitFor(() => !result.current.loading);

    expect(result.current.loading).toBe(false);
    expect(result.current.transaction).toEqual({ name: '' });
    expect(lastValueFrom).toHaveBeenCalledTimes(1);
  });
});
