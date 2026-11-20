/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { act, renderHook } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import type { UserProfileData } from '@kbn/core-user-profile-common';
import { deriveChromeColors } from '@kbn/core-user-settings-common';
import { useChromeBackground } from './use_chrome_background';

const createUserProfile = (data: UserProfileData | null) => {
  const profile$ = new BehaviorSubject<UserProfileData | null>(data);
  const userProfile = {
    getUserProfile$: () => profile$.asObservable(),
  } as unknown as UserProfileService;
  return { userProfile, profile$ };
};

const withColorMode =
  (colorMode: 'light' | 'dark') =>
  ({ children }: { children: React.ReactNode }) =>
    (
      <EuiProvider colorMode={colorMode} globalStyles={false}>
        {children}
      </EuiProvider>
    );

describe('useChromeBackground', () => {
  const base = '#0B64DD';
  const derived = deriveChromeColors(base);

  it('returns undefined when the user has no custom color', () => {
    const { userProfile } = createUserProfile({ userSettings: { chromeColor: '' } });
    const { result } = renderHook(() => useChromeBackground(userProfile, true), {
      wrapper: withColorMode('light'),
    });
    expect(result.current).toBeUndefined();
  });

  it('returns undefined when there is no profile', () => {
    const { userProfile } = createUserProfile(null);
    const { result } = renderHook(() => useChromeBackground(userProfile, true), {
      wrapper: withColorMode('light'),
    });
    expect(result.current).toBeUndefined();
  });

  it('returns undefined when disabled, even with a custom color', () => {
    const { userProfile } = createUserProfile({ userSettings: { chromeColor: base } });
    const { result } = renderHook(() => useChromeBackground(userProfile, false), {
      wrapper: withColorMode('light'),
    });
    expect(result.current).toBeUndefined();
  });

  it('uses the derived light tint in light mode', () => {
    const { userProfile } = createUserProfile({ userSettings: { chromeColor: base } });
    const { result } = renderHook(() => useChromeBackground(userProfile, true), {
      wrapper: withColorMode('light'),
    });
    expect(result.current).toEqual({ background: derived.light, colorMode: 'light' });
  });

  it('uses the derived dark shade in dark mode', () => {
    const { userProfile } = createUserProfile({ userSettings: { chromeColor: base } });
    const { result } = renderHook(() => useChromeBackground(userProfile, true), {
      wrapper: withColorMode('dark'),
    });
    expect(result.current).toEqual({ background: derived.dark, colorMode: 'dark' });
  });

  it('prefers the per mode override and picks the color mode that keeps it readable', () => {
    const { userProfile } = createUserProfile({
      userSettings: { chromeColor: base, chromeColorLight: '#07101F' },
    });
    const { result } = renderHook(() => useChromeBackground(userProfile, true), {
      wrapper: withColorMode('light'),
    });
    // A dark override in light mode needs light text, i.e. the dark color mode.
    expect(result.current).toEqual({ background: '#07101F', colorMode: 'dark' });
  });

  it('updates live when the user profile emits', () => {
    const { userProfile, profile$ } = createUserProfile({ userSettings: { chromeColor: base } });
    const { result } = renderHook(() => useChromeBackground(userProfile, true), {
      wrapper: withColorMode('light'),
    });
    expect(result.current?.background).toBe(derived.light);

    act(() => {
      profile$.next({ userSettings: { chromeColor: '#F04E98' } });
    });
    expect(result.current?.background).toBe(deriveChromeColors('#F04E98').light);

    act(() => {
      profile$.next({ userSettings: { chromeColor: '' } });
    });
    expect(result.current).toBeUndefined();
  });
});
