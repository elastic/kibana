/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, ReplaySubject, Subject } from 'rxjs';
import { userProfileServiceMock } from '@kbn/core-user-profile-browser-mocks';
import { themeServiceMock } from '@kbn/core-theme-browser-mocks';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { settingsServiceMock, uiSettingsServiceMock } from '@kbn/core-ui-settings-browser-mocks';
import { injectedMetadataServiceMock } from '@kbn/core-injected-metadata-browser-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { UserProfileData } from '@kbn/core-user-profile-common';
import type { GetUserProfileResponse } from '@kbn/core-user-profile-browser';
import { syncColorMode } from './sync_color_mode';

const mockBrowsersSupportsSystemTheme = jest.fn();

jest.mock('@kbn/core-theme-browser-internal', () => {
  const original = jest.requireActual('@kbn/core-theme-browser-internal');

  return {
    ...original,
    browsersSupportsSystemTheme: () => mockBrowsersSupportsSystemTheme(),
  };
});

type DarkModeSetting = 'system' | boolean;

describe('syncColorMode', () => {
  const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));
  const originalMatchMedia = window.matchMedia;

  let mediaQueryListeners: Array<(event: { matches: boolean }) => void>;
  let systemIsDark: boolean;

  beforeEach(() => {
    mediaQueryListeners = [];
    systemIsDark = false;
    mockBrowsersSupportsSystemTheme.mockReturnValue(true);
    window.matchMedia = jest.fn().mockImplementation(() => ({
      get matches() {
        return systemIsDark;
      },
      addEventListener: (_type: string, listener: (event: { matches: boolean }) => void) => {
        mediaQueryListeners.push(listener);
      },
      removeEventListener: (_type: string, listener: (event: { matches: boolean }) => void) => {
        mediaQueryListeners = mediaQueryListeners.filter((l) => l !== listener);
      },
    }));
  });

  afterAll(() => {
    window.matchMedia = originalMatchMedia;
  });

  const changeSystemColorMode = (isDark: boolean) => {
    systemIsDark = isDark;
    mediaQueryListeners.forEach((listener) => listener({ matches: isDark }));
  };

  const setup = ({
    serverDarkMode = false,
    spaceDarkMode = 'disabled',
    userDarkMode,
    isOverridden = false,
    isAnonymous = false,
  }: {
    serverDarkMode?: DarkModeSetting;
    spaceDarkMode?: string;
    userDarkMode?: string;
    isOverridden?: boolean;
    isAnonymous?: boolean;
  } = {}) => {
    const theme = themeServiceMock.createInternalStartContract();
    const injectedMetadata = injectedMetadataServiceMock.createStartContract();
    injectedMetadata.getTheme.mockReturnValue({
      ...injectedMetadata.getTheme(),
      darkMode: serverDarkMode,
    });

    const userProfile = userProfileServiceMock.createStart();
    const dataUpdates$ = new Subject<UserProfileData>();
    userProfile.getDataUpdates$.mockReturnValue(dataUpdates$);
    userProfile.getCurrent.mockResolvedValue({
      data: { userSettings: { darkMode: userDarkMode } },
    } as any);

    const uiSettings = uiSettingsServiceMock.createStartContract();
    const uiSettingsDarkMode$ = new BehaviorSubject<string>(spaceDarkMode);
    uiSettings.get.mockImplementation(() => uiSettingsDarkMode$.getValue());
    uiSettings.get$.mockReturnValue(uiSettingsDarkMode$);
    uiSettings.isOverridden.mockReturnValue(isOverridden);

    // Advanced Settings writes through `settings.client`, a separate client from `uiSettings`.
    const settings = settingsServiceMock.createStartContract();
    const spaceDarkMode$ = new BehaviorSubject<string>(spaceDarkMode);
    settings.client.get$.mockReturnValue(spaceDarkMode$);

    const http = httpServiceMock.createStartContract();
    http.anonymousPaths.isAnonymous.mockReturnValue(isAnonymous);

    const stop$ = new ReplaySubject<void>(1);
    const logger = loggerMock.create();

    syncColorMode({
      theme,
      injectedMetadata,
      userProfile,
      uiSettings,
      settings,
      http,
      stop$,
      logger,
    });

    return { theme, dataUpdates$, spaceDarkMode$, uiSettingsDarkMode$, userProfile, stop$, logger };
  };

  it('keeps the server-resolved color mode on start', () => {
    const { theme } = setup({ serverDarkMode: true });

    expect(theme.setDarkMode).toHaveBeenCalledTimes(1);
    expect(theme.setDarkMode).toHaveBeenLastCalledWith(true);
  });

  it('does nothing on anonymous pages', () => {
    const { theme, dataUpdates$ } = setup({ isAnonymous: true });

    dataUpdates$.next({ userSettings: { darkMode: 'dark' } });

    expect(theme.setDarkMode).not.toHaveBeenCalled();
  });

  describe('user profile updates', () => {
    it('applies a saved dark mode preference', () => {
      const { theme, dataUpdates$ } = setup();

      dataUpdates$.next({ userSettings: { darkMode: 'dark' } });
      expect(theme.setDarkMode).toHaveBeenLastCalledWith(true);

      dataUpdates$.next({ userSettings: { darkMode: 'light' } });
      expect(theme.setDarkMode).toHaveBeenLastCalledWith(false);
    });

    it('falls back to the space setting for "space_default"', () => {
      const { theme, dataUpdates$ } = setup({ spaceDarkMode: 'enabled', serverDarkMode: false });

      dataUpdates$.next({ userSettings: { darkMode: 'space_default' } });

      expect(theme.setDarkMode).toHaveBeenLastCalledWith(true);
    });

    it('follows the system color mode for "system"', () => {
      const { theme, dataUpdates$ } = setup();

      systemIsDark = true;
      dataUpdates$.next({ userSettings: { darkMode: 'system' } });
      expect(theme.setDarkMode).toHaveBeenLastCalledWith(true);

      changeSystemColorMode(false);
      expect(theme.setDarkMode).toHaveBeenLastCalledWith(false);
    });

    it('ignores updates that do not include a dark mode preference', () => {
      const { theme, dataUpdates$ } = setup({ spaceDarkMode: 'enabled', serverDarkMode: false });

      dataUpdates$.next({ userSettings: { contrastMode: 'high' } });
      dataUpdates$.next({ avatar: { initials: 'AB' } });

      expect(theme.setDarkMode).toHaveBeenCalledTimes(1);
      expect(theme.setDarkMode).toHaveBeenLastCalledWith(false);
    });

    it('ignores the user preference when the space setting is overridden', () => {
      const { theme, dataUpdates$ } = setup({ isOverridden: true });

      dataUpdates$.next({ userSettings: { darkMode: 'dark' } });

      expect(theme.setDarkMode).toHaveBeenCalledTimes(1);
      expect(theme.setDarkMode).toHaveBeenLastCalledWith(false);
    });
  });

  describe('space setting updates', () => {
    it('applies the space setting when the user has no preference', async () => {
      const { theme, spaceDarkMode$ } = setup({ userDarkMode: 'space_default' });

      spaceDarkMode$.next('enabled');
      await flushPromises();

      expect(theme.setDarkMode).toHaveBeenLastCalledWith(true);
    });

    it('applies a space setting change made through uiSettings', async () => {
      const { theme, uiSettingsDarkMode$ } = setup({ userDarkMode: 'space_default' });

      uiSettingsDarkMode$.next('enabled');
      await flushPromises();

      expect(theme.setDarkMode).toHaveBeenLastCalledWith(true);
    });

    it('uses the latest space setting when the user switches to "space_default"', async () => {
      const { theme, spaceDarkMode$, dataUpdates$ } = setup({ userDarkMode: 'light' });

      spaceDarkMode$.next('enabled');
      await flushPromises();
      expect(theme.setDarkMode).toHaveBeenLastCalledWith(false);

      dataUpdates$.next({ userSettings: { darkMode: 'space_default' } });

      expect(theme.setDarkMode).toHaveBeenLastCalledWith(true);
    });

    it('applies the space setting when the user has no profile', async () => {
      const { theme, spaceDarkMode$, userProfile } = setup();
      // The default implementation, used when no profile provider is registered, resolves `null`.
      userProfile.getCurrent.mockResolvedValue(null as unknown as GetUserProfileResponse);

      spaceDarkMode$.next('enabled');
      await flushPromises();

      expect(theme.setDarkMode).toHaveBeenLastCalledWith(true);
    });

    it('keeps the user preference over the space setting', async () => {
      const { theme, spaceDarkMode$ } = setup({ userDarkMode: 'light' });

      spaceDarkMode$.next('enabled');
      await flushPromises();

      expect(theme.setDarkMode).toHaveBeenLastCalledWith(false);
    });

    it('follows the system color mode when the space setting is "system"', async () => {
      const { theme, spaceDarkMode$ } = setup();

      spaceDarkMode$.next('system');
      await flushPromises();
      expect(theme.setDarkMode).toHaveBeenLastCalledWith(false);

      changeSystemColorMode(true);
      expect(theme.setDarkMode).toHaveBeenLastCalledWith(true);
    });

    it('falls back to the space setting when the user profile request fails', async () => {
      const { theme, spaceDarkMode$, userProfile, logger } = setup();
      userProfile.getCurrent.mockRejectedValue(new Error('boom'));

      spaceDarkMode$.next('enabled');
      await flushPromises();

      expect(theme.setDarkMode).toHaveBeenLastCalledWith(true);
      expect(logger.error).toHaveBeenCalledWith(new Error('boom'));
    });
  });

  describe('system color mode', () => {
    it('follows the system color mode when the server resolved "system"', () => {
      const { theme } = setup({ serverDarkMode: 'system' });
      expect(theme.setDarkMode).toHaveBeenLastCalledWith(false);

      changeSystemColorMode(true);

      expect(theme.setDarkMode).toHaveBeenLastCalledWith(true);
    });

    it('stops following the system color mode after switching to an explicit mode', () => {
      const { theme, dataUpdates$ } = setup({ serverDarkMode: 'system' });

      dataUpdates$.next({ userSettings: { darkMode: 'light' } });
      expect(mediaQueryListeners).toHaveLength(0);

      changeSystemColorMode(true);

      expect(theme.setDarkMode).toHaveBeenLastCalledWith(false);
    });

    it('uses light mode when the browser does not support a system color mode', () => {
      mockBrowsersSupportsSystemTheme.mockReturnValue(false);
      const { theme } = setup({ serverDarkMode: 'system' });

      expect(theme.setDarkMode).toHaveBeenLastCalledWith(false);
      expect(mediaQueryListeners).toHaveLength(0);
    });
  });

  it('stops syncing on stop$', () => {
    const { theme, dataUpdates$, stop$ } = setup({ serverDarkMode: 'system' });
    expect(mediaQueryListeners).toHaveLength(1);

    stop$.next();

    expect(mediaQueryListeners).toHaveLength(0);
    dataUpdates$.next({ userSettings: { darkMode: 'dark' } });
    expect(theme.setDarkMode).toHaveBeenCalledTimes(1);
  });
});
