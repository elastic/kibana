/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  BehaviorSubject,
  catchError,
  filter,
  from,
  fromEvent,
  map,
  merge,
  of,
  skip,
  startWith,
  switchMap,
  takeUntil,
  type Observable,
} from 'rxjs';
import { parseDarkModeValue, type DarkModeValue } from '@kbn/core-ui-settings-common';
import type { InternalThemeServiceStart } from '@kbn/core-theme-browser-internal-types';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import type { UserProfileData } from '@kbn/core-user-profile-common';
import type { InternalHttpStart } from '@kbn/core-http-browser-internal';
import type { IUiSettingsClient, SettingsStart } from '@kbn/core-ui-settings-browser';
import type { InternalInjectedMetadataStart } from '@kbn/core-injected-metadata-browser-internal';
import { browsersSupportsSystemTheme } from '@kbn/core-theme-browser-internal';
import type { Logger } from '@kbn/logging';

const DARK_MODE_SETTING = 'theme:darkMode';

/** `undefined` means the user defers to the space setting. */
const parseUserDarkMode = (value: unknown): DarkModeValue | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  switch (value.toUpperCase()) {
    case 'SYSTEM':
      return 'system';
    case 'DARK':
      return true;
    case 'LIGHT':
      return false;
    default:
      return undefined;
  }
};

interface ColorModeProfileData extends UserProfileData {
  userSettings?: { darkMode?: string };
}

const getUserDarkModeValue = (data: ColorModeProfileData | null | undefined) =>
  parseUserDarkMode(data?.userSettings?.darkMode);

const hasDarkModeUpdate = (data: UserProfileData): data is ColorModeProfileData => {
  const { userSettings } = data as ColorModeProfileData;
  return Boolean(userSettings && 'darkMode' in userSettings);
};

const systemDarkMode$ = (): Observable<boolean> => {
  if (!browsersSupportsSystemTheme()) {
    return of(false);
  }
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  return fromEvent<MediaQueryListEvent>(mediaQuery, 'change').pipe(
    map((event) => event.matches),
    startWith(mediaQuery.matches)
  );
};

interface SyncColorModeDeps {
  theme: InternalThemeServiceStart;
  injectedMetadata: InternalInjectedMetadataStart;
  userProfile: UserProfileService;
  uiSettings: IUiSettingsClient;
  settings: SettingsStart;
  http: InternalHttpStart;
  stop$: Observable<void>;
  logger: Logger;
}

/**
 * Applies color mode changes live, resolving the effective value the same way the server does
 * when rendering the page: the user profile wins over the space setting, unless the space setting
 * is overridden in kibana.yml.
 */
export function syncColorMode({
  theme,
  injectedMetadata,
  userProfile,
  uiSettings,
  settings,
  http,
  stop$,
  logger,
}: SyncColorModeDeps): void {
  if (http.anonymousPaths.isAnonymous(window.location.pathname)) {
    return;
  }

  const isOverridden = uiSettings.isOverridden(DARK_MODE_SETTING);

  // `uiSettings` and `settings.client` are separate clients with separate caches, and Advanced
  // Settings writes through `settings.client`, so a change can surface on either one.
  const spaceDarkMode$ = new BehaviorSubject<DarkModeValue>(
    parseDarkModeValue(uiSettings.get(DARK_MODE_SETTING))
  );
  merge(
    uiSettings.get$(DARK_MODE_SETTING).pipe(skip(1)),
    settings.client.get$(DARK_MODE_SETTING).pipe(skip(1))
  )
    .pipe(map(parseDarkModeValue), takeUntil(stop$))
    .subscribe(spaceDarkMode$);

  const userChange$: Observable<DarkModeValue> = isOverridden
    ? of()
    : userProfile.getDataUpdates$().pipe(
        filter(hasDarkModeUpdate),
        map((data) => getUserDarkModeValue(data) ?? spaceDarkMode$.getValue())
      );

  const spaceChange$: Observable<DarkModeValue> = spaceDarkMode$.pipe(
    skip(1),
    switchMap((spaceDarkMode) => {
      if (isOverridden) {
        return of(spaceDarkMode);
      }
      return from(userProfile.getCurrent<ColorModeProfileData>({ dataPath: 'userSettings' })).pipe(
        map((profile) => getUserDarkModeValue(profile?.data) ?? spaceDarkMode),
        catchError((error) => {
          logger.error(error);
          return of(spaceDarkMode);
        })
      );
    })
  );

  merge(userChange$, spaceChange$)
    .pipe(
      startWith(injectedMetadata.getTheme().darkMode),
      switchMap((darkMode) => (darkMode === 'system' ? systemDarkMode$() : of(darkMode))),
      takeUntil(stop$)
    )
    .subscribe({
      next: (darkMode) => theme.setDarkMode(darkMode),
      error: (error) => logger.error(error),
    });
}
