/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import type { DashboardState } from '../../../../../../common';
import { DEFAULT_DASHBOARD_OPTIONS } from '../../../../../../common/constants';
import { useSanitizedState } from './use_sanitized_state';

describe('useSanitizedDashboardState', () => {
  const dashboardState: DashboardState = {
    title: 'my dashboard',
    panels: [],
    pinned_panels: [],
    options: DEFAULT_DASHBOARD_OPTIONS,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('starts loading and then returns a success state', async () => {
    const sanitizeDashboard = jest.fn().mockResolvedValue({
      data: { ...dashboardState, title: 'my dashboard (sanitized)' },
      warnings: [],
    });

    const { result } = renderHook(() =>
      useSanitizedState({ state: dashboardState, sanitizeState: sanitizeDashboard })
    );
    expect(result.current.status).toBe('loading');

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    expect(sanitizeDashboard).toHaveBeenCalledTimes(1);
  });

  test('retries when retry is called', async () => {
    const sanitizeDashboard = jest
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({
        data: { ...dashboardState, title: 'my dashboard (sanitized)' },
        warnings: [],
      });

    const { result } = renderHook(() =>
      useSanitizedState({ state: dashboardState, sanitizeState: sanitizeDashboard })
    );
    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });

    act(() => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(sanitizeDashboard).toHaveBeenCalledTimes(2);
      expect(result.current.status).toBe('success');
    });
  });
});
