/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { useSanitizedState } from './use_sanitized_state';

describe('useSanitizedState', () => {
  const state = { title: 'saved object' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('starts loading and then returns a success state', async () => {
    const sanitizeState = jest.fn().mockResolvedValue({
      data: { ...state, title: 'saved object (sanitized)' },
      warnings: [],
    });

    const { result } = renderHook(() => useSanitizedState({ state, sanitizeState }));
    expect(result.current.status).toBe('loading');

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    expect(sanitizeState).toHaveBeenCalledTimes(1);
  });

  test('retries when retry is called', async () => {
    const sanitizeState = jest
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({
        data: { ...state, title: 'saved object (sanitized)' },
        warnings: [],
      });

    const { result } = renderHook(() => useSanitizedState({ state, sanitizeState }));
    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });

    act(() => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(sanitizeState).toHaveBeenCalledTimes(2);
      expect(result.current.status).toBe('success');
    });
  });
});
