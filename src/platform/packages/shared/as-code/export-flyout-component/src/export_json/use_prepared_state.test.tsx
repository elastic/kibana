/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { usePreparedState } from './use_prepared_state';

describe('usePreparedState', () => {
  const state = {
    title: 'my object',
    items: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('starts loading and then returns a success state', async () => {
    const prepareExportJson = jest.fn().mockResolvedValue({
      data: { ...state, title: 'my object (prepared)' },
      warnings: ['Unsupported property removed'],
    });

    const { result } = renderHook(() => usePreparedState({ state, prepareExportJson }));
    expect(result.current.status).toBe('loading');

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    expect(prepareExportJson).toHaveBeenCalledTimes(1);
    expect(result.current.warnings).toEqual(['Unsupported property removed']);
  });

  test('retries when retry is called', async () => {
    const prepareExportJson = jest
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({
        data: { ...state, title: 'my object (prepared)' },
        warnings: [],
      });

    const { result } = renderHook(() => usePreparedState({ state, prepareExportJson }));
    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });

    act(() => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(prepareExportJson).toHaveBeenCalledTimes(2);
      expect(result.current.status).toBe('success');
    });
    expect(prepareExportJson).toHaveBeenNthCalledWith(1, state);
    expect(prepareExportJson).toHaveBeenNthCalledWith(2, state);
  });

  test('uses the state returned by the preparation function', async () => {
    const prepareExportJson = jest.fn(async (currentState) => ({
      data: currentState,
      warnings: [],
    }));
    const { result } = renderHook(() => usePreparedState({ state, prepareExportJson }));

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    expect(result.current.data).toBe(state);
    expect(result.current.warnings).toEqual([]);
    expect(prepareExportJson).toHaveBeenCalledWith(state);
  });
});
