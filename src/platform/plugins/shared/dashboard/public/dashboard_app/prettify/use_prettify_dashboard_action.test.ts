/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, waitFor } from '@testing-library/react';
import { BehaviorSubject, map, merge, skip } from 'rxjs';
import type { DashboardApi } from '../../dashboard_api/types';
import { uiActionsService } from '../../services/kibana_services';
import { PRETTIFY_DASHBOARD_ACTION_ID } from './prettify_dashboard_action';
import { usePrettifyDashboardAction } from './use_prettify_dashboard_action';

type TestDashboardApi = DashboardApi & {
  viewMode$: BehaviorSubject<string>;
};

const createDashboardApi = (): TestDashboardApi =>
  ({
    viewMode$: new BehaviorSubject('edit'),
    children$: new BehaviorSubject({}),
  }) as unknown as TestDashboardApi;

describe('usePrettifyDashboardAction', () => {
  const mockExecute = jest.fn();
  const mockIsCompatible = jest.fn(async () => true);

  beforeEach(() => {
    mockExecute.mockClear();
    mockIsCompatible.mockReset();
    mockIsCompatible.mockResolvedValue(true);
    (uiActionsService.hasAction as jest.Mock).mockReturnValue(true);
    (uiActionsService.getAction as jest.Mock).mockResolvedValue({
      isCompatible: mockIsCompatible,
      execute: mockExecute,
      getCompatibilityChangesSubject: ({ dashboardApi }: { dashboardApi: DashboardApi }) =>
        merge(dashboardApi.viewMode$, dashboardApi.children$).pipe(
          skip(1),
          map(() => undefined)
        ),
    });
  });

  it('returns null when the action is not registered', () => {
    (uiActionsService.hasAction as jest.Mock).mockReturnValue(false);
    const dashboardApi = createDashboardApi();

    const { result } = renderHook(() => usePrettifyDashboardAction(dashboardApi));

    expect(result.current).toBeNull();
  });

  it('returns null when the action is incompatible', async () => {
    mockIsCompatible.mockResolvedValue(false);
    const dashboardApi = createDashboardApi();

    const { result } = renderHook(() => usePrettifyDashboardAction(dashboardApi));

    await waitFor(() => {
      expect(mockIsCompatible).toHaveBeenCalled();
    });
    expect(result.current).toBeNull();
  });

  it('returns an execute handler when the action is compatible', async () => {
    const dashboardApi = createDashboardApi();

    const { result } = renderHook(() => usePrettifyDashboardAction(dashboardApi));

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    await result.current?.execute();

    expect(mockExecute).toHaveBeenCalledWith({
      dashboardApi,
      trigger: { id: PRETTIFY_DASHBOARD_ACTION_ID },
    });
  });

  it('returns null when the action becomes incompatible', async () => {
    mockIsCompatible.mockResolvedValue(true);
    const dashboardApi = createDashboardApi();

    const { result } = renderHook(() => usePrettifyDashboardAction(dashboardApi));

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    mockIsCompatible.mockResolvedValue(false);
    dashboardApi.viewMode$.next('view');

    await waitFor(() => {
      expect(result.current).toBeNull();
    });
  });
});
