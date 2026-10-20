/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, waitFor } from '@testing-library/react';
import { BehaviorSubject, map, skip } from 'rxjs';
import type { DashboardApi } from '../../../dashboard_api/types';
import { uiActionsService } from '../../../services/kibana_services';
import { ENHANCE_DASHBOARD_ACTION_ID } from './constants';
import { useEnhanceButtonProps } from './use_enhance_button_props';

type TestDashboardApi = DashboardApi & {
  viewMode$: BehaviorSubject<string>;
  children$: BehaviorSubject<object>;
};

const createDashboardApi = (): TestDashboardApi =>
  ({
    viewMode$: new BehaviorSubject('edit'),
    children$: new BehaviorSubject({}),
  } as unknown as TestDashboardApi);

describe('useEnhanceButtonProps', () => {
  const mockExecute = jest.fn();
  const mockIsCompatible = jest.fn(async () => true);
  const mockIsDisabled = jest.fn(() => false);
  const mockGetDisplayNameTooltip = jest.fn(
    () => 'Enhance requires at least one ES|QL visualization'
  );

  beforeEach(() => {
    mockExecute.mockClear();
    mockIsCompatible.mockReset();
    mockIsCompatible.mockResolvedValue(true);
    mockIsDisabled.mockReset();
    mockIsDisabled.mockReturnValue(false);
    mockGetDisplayNameTooltip.mockReturnValue('Enhance requires at least one ES|QL visualization');
    (uiActionsService.hasAction as jest.Mock).mockReturnValue(true);
    (uiActionsService.getAction as jest.Mock).mockResolvedValue({
      isCompatible: mockIsCompatible,
      execute: mockExecute,
      isDisabled: mockIsDisabled,
      getDisplayNameTooltip: mockGetDisplayNameTooltip,
      getCompatibilityChangesSubject: ({ dashboardApi }: { dashboardApi: DashboardApi }) =>
        dashboardApi.viewMode$.pipe(
          skip(1),
          map(() => undefined)
        ),
      getDisabledStateChangesSubject: ({ dashboardApi }: { dashboardApi: DashboardApi }) =>
        dashboardApi.children$.pipe(
          skip(1),
          map(() => undefined)
        ),
    });
  });

  it('returns undefined when the action is not registered', () => {
    (uiActionsService.hasAction as jest.Mock).mockReturnValue(false);
    const dashboardApi = createDashboardApi();

    const { result } = renderHook(() => useEnhanceButtonProps(dashboardApi));

    expect(result.current).toBeUndefined();
  });

  it('returns undefined when the action is incompatible', async () => {
    mockIsCompatible.mockResolvedValue(false);
    const dashboardApi = createDashboardApi();

    const { result } = renderHook(() => useEnhanceButtonProps(dashboardApi));

    await waitFor(() => {
      expect(mockIsCompatible).toHaveBeenCalled();
    });
    expect(result.current).toBeUndefined();
  });

  it('returns a click handler that executes the action when it is compatible', async () => {
    const dashboardApi = createDashboardApi();

    const { result } = renderHook(() => useEnhanceButtonProps(dashboardApi));

    await waitFor(() => {
      expect(result.current).not.toBeUndefined();
    });

    result.current?.onClick({ returnFocus: jest.fn() });

    expect(mockExecute).toHaveBeenCalledWith({
      dashboardApi,
      trigger: { id: ENHANCE_DASHBOARD_ACTION_ID },
    });
  });

  it('returns undefined when the action becomes incompatible', async () => {
    mockIsCompatible.mockResolvedValue(true);
    const dashboardApi = createDashboardApi();

    const { result } = renderHook(() => useEnhanceButtonProps(dashboardApi));

    await waitFor(() => {
      expect(result.current).not.toBeUndefined();
    });

    mockIsCompatible.mockResolvedValue(false);
    dashboardApi.viewMode$.next('view');

    await waitFor(() => {
      expect(result.current).toBeUndefined();
    });
  });

  it('is enabled with the action tooltip when the action is not disabled', async () => {
    mockGetDisplayNameTooltip.mockReturnValue(
      'Improve the content and style of your dashboard using AI'
    );
    const dashboardApi = createDashboardApi();

    const { result } = renderHook(() => useEnhanceButtonProps(dashboardApi));

    await waitFor(() => {
      expect(result.current).not.toBeUndefined();
    });
    expect(result.current?.isDisabled).toBe(false);
    expect(result.current?.tooltip).toBe(
      'Improve the content and style of your dashboard using AI'
    );
  });

  it('is disabled with the action tooltip when the action is disabled', async () => {
    mockIsDisabled.mockReturnValue(true);
    const dashboardApi = createDashboardApi();

    const { result } = renderHook(() => useEnhanceButtonProps(dashboardApi));

    await waitFor(() => {
      expect(result.current?.isDisabled).toBe(true);
    });
    expect(result.current?.tooltip).toBe('Enhance requires at least one ES|QL visualization');
  });

  it('updates when the disabled state changes', async () => {
    mockIsDisabled.mockReturnValue(true);
    const dashboardApi = createDashboardApi();

    const { result } = renderHook(() => useEnhanceButtonProps(dashboardApi));

    await waitFor(() => {
      expect(result.current?.isDisabled).toBe(true);
    });

    mockIsDisabled.mockReturnValue(false);
    dashboardApi.children$.next({});

    await waitFor(() => {
      expect(result.current?.isDisabled).toBe(false);
    });
  });
});
