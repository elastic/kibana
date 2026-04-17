/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import type { DashboardState } from '../../server';
import { DEFAULT_DASHBOARD_OPTIONS } from '../../common/constants';
import { sanitizeDashboard } from './sanitize_dashboard';
import { useSanitizedDashboardState } from './use_sanitized_dashboard_state';

jest.mock('./sanitize_dashboard', () => ({
  sanitizeDashboard: jest.fn(),
}));

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
    (sanitizeDashboard as jest.Mock).mockResolvedValue({
      data: { ...dashboardState, title: 'my dashboard (sanitized)' },
      warnings: [],
    });

    const { result } = renderHook(() => useSanitizedDashboardState({ dashboardState }));
    expect(result.current.status).toBe('loading');

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    expect(sanitizeDashboard).toHaveBeenCalledTimes(1);
  });

  test('retries when retry is called', async () => {
    (sanitizeDashboard as jest.Mock)
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({
        data: { ...dashboardState, title: 'my dashboard (sanitized)' },
        warnings: [],
      });

    const { result } = renderHook(() => useSanitizedDashboardState({ dashboardState }));

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
