/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { useRouteMatch } from 'react-router-dom';
import { BehaviorSubject } from 'rxjs';
import { ProjectRoutingAccess } from '../types';
import { useCpsPickerAccess } from './use_cps_picker_access';

jest.mock('react-router-dom', () => ({
  useRouteMatch: jest.fn(),
}));

const mockUseRouteMatch = jest.mocked(useRouteMatch);
const mockCurrentAppId$ = new BehaviorSubject<string | undefined>('app-id');

describe('useCpsPickerAccess', () => {
  const registerAppAccess = jest.fn();
  const services = {
    application: { currentAppId$: mockCurrentAppId$ },
    cps: { cpsManager: { registerAppAccess } },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouteMatch.mockReturnValue({ url: '/app/alerts/rule/123' } as any);
  });

  const getRegisteredCallback = () =>
    registerAppAccess.mock.calls[registerAppAccess.mock.calls.length - 1]?.[1];

  it('registers access for the current app and matches the route', () => {
    renderHook(() => useCpsPickerAccess(ProjectRoutingAccess.READONLY, services));

    expect(registerAppAccess).toHaveBeenCalledTimes(1);
    expect(registerAppAccess).toHaveBeenCalledWith('app-id', expect.any(Function));

    const callback = getRegisteredCallback();
    expect(callback?.('/app/alerts/rule/123')).toBe(ProjectRoutingAccess.READONLY);
    expect(callback?.('/app/alerts/rule/999')).toBe(ProjectRoutingAccess.DISABLED);
  });

  it('updates the access value when rerendered with a new access', () => {
    const { rerender } = renderHook(({ access }) => useCpsPickerAccess(access, services), {
      initialProps: { access: ProjectRoutingAccess.DISABLED },
    });

    rerender({ access: ProjectRoutingAccess.READONLY });

    expect(registerAppAccess).toHaveBeenCalledTimes(3);
    const callback = getRegisteredCallback();
    expect(callback?.('/app/alerts/rule/123')).toBe(ProjectRoutingAccess.READONLY);
    expect(callback?.('/app/alerts/rule/999')).toBe(ProjectRoutingAccess.DISABLED);
  });

  it('resets access to disabled on unmount', () => {
    const { unmount } = renderHook(() =>
      useCpsPickerAccess(ProjectRoutingAccess.READONLY, services)
    );

    unmount();

    expect(registerAppAccess).toHaveBeenCalledTimes(2);
    const callback = getRegisteredCallback();
    expect(callback?.('/app/alerts/rule/123')).toBe(ProjectRoutingAccess.DISABLED);
  });

  it('does not register when currentAppId is missing', () => {
    mockCurrentAppId$.next(undefined);

    renderHook(() => useCpsPickerAccess(ProjectRoutingAccess.READONLY, services));

    expect(registerAppAccess).not.toHaveBeenCalled();
  });

  it('does not register when cpsManager is missing', () => {
    renderHook(() =>
      useCpsPickerAccess(ProjectRoutingAccess.READONLY, {
        application: { currentAppId$: mockCurrentAppId$ },
        cps: {} as any,
      })
    );

    expect(registerAppAccess).not.toHaveBeenCalled();
  });
});
