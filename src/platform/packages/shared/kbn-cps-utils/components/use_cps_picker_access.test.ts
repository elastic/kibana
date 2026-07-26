/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';
import { type ICPSManager, ProjectRoutingAccess } from '../types';
import { useCpsPickerAccess } from './use_cps_picker_access';

describe('useCpsPickerAccess', () => {
  const registerAppAccess = jest.fn();
  const mockCurrentAppId$ = new BehaviorSubject<string | undefined>('app-id');
  const cpsManager = { registerAppAccess } as unknown as ICPSManager;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentAppId$.next('app-id');
  });

  it('registers the provided resolver when app id and cpsManager are defined', () => {
    const resolver = jest.fn().mockReturnValue(ProjectRoutingAccess.READONLY);

    renderHook(() =>
      useCpsPickerAccess({
        resolver,
        currentAppId$: mockCurrentAppId$,
        cpsManager,
      })
    );

    expect(registerAppAccess).toHaveBeenCalledTimes(1);
    expect(registerAppAccess).toHaveBeenCalledWith('app-id', resolver);
  });

  it('does not register when currentAppId is undefined', () => {
    mockCurrentAppId$.next(undefined);

    renderHook(() =>
      useCpsPickerAccess({
        resolver: () => ProjectRoutingAccess.READONLY,
        currentAppId$: mockCurrentAppId$,
        cpsManager,
      })
    );

    expect(registerAppAccess).not.toHaveBeenCalled();
  });

  it('does not register when cpsManager is undefined', () => {
    renderHook(() =>
      useCpsPickerAccess({
        resolver: () => ProjectRoutingAccess.READONLY,
        currentAppId$: mockCurrentAppId$,
        cpsManager: undefined,
      })
    );

    expect(registerAppAccess).not.toHaveBeenCalled();
  });

  it('re-registers when the resolver reference changes', () => {
    const resolverA = jest.fn().mockReturnValue(ProjectRoutingAccess.DISABLED);
    const resolverB = jest.fn().mockReturnValue(ProjectRoutingAccess.EDITABLE);

    const { rerender } = renderHook(
      ({ resolver }) =>
        useCpsPickerAccess({ resolver, currentAppId$: mockCurrentAppId$, cpsManager }),
      {
        initialProps: { resolver: resolverA },
      }
    );

    expect(registerAppAccess).toHaveBeenLastCalledWith('app-id', resolverA);

    rerender({ resolver: resolverB });

    expect(registerAppAccess).toHaveBeenLastCalledWith('app-id', resolverB);
  });

  it('re-registers when currentAppId$ emits a new app id', () => {
    const resolver = jest.fn().mockReturnValue(ProjectRoutingAccess.READONLY);

    const { rerender } = renderHook(() =>
      useCpsPickerAccess({
        resolver,
        currentAppId$: mockCurrentAppId$,
        cpsManager,
      })
    );

    expect(registerAppAccess).toHaveBeenCalledWith('app-id', resolver);

    mockCurrentAppId$.next('other-app');
    rerender();

    expect(registerAppAccess).toHaveBeenLastCalledWith('other-app', resolver);
  });

  it('resets access to DISABLED on unmount', () => {
    const resolver = jest.fn().mockReturnValue(ProjectRoutingAccess.READONLY);

    const { unmount } = renderHook(() =>
      useCpsPickerAccess({
        resolver,
        currentAppId$: mockCurrentAppId$,
        cpsManager,
      })
    );

    unmount();

    expect(registerAppAccess).toHaveBeenCalledTimes(2);
    const cleanupResolver = registerAppAccess.mock.calls[1][1];
    expect(cleanupResolver('any-location')).toBe(ProjectRoutingAccess.DISABLED);
  });
});
