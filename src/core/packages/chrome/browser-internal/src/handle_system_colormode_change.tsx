/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { mountReactNode } from '@kbn/core-mount-utils-browser-internal';
import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { I18nStart } from '@kbn/core-i18n-browser';
import type { ThemeServiceStart } from '@kbn/core-theme-browser';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import { take, type Observable } from 'rxjs';
import { browsersSupportsSystemTheme } from '@kbn/core-theme-browser-internal';
import type { InternalHttpStart } from '@kbn/core-http-browser-internal';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';

const doSyncWithSystem = (
  userSettings: { darkMode?: string } = { darkMode: 'space_default' },
  uiSettingsDarkModeValue: string = 'disabled'
): boolean => {
  const { darkMode: userProfileDarkModeValue = 'space_default' } = userSettings;

  if (userProfileDarkModeValue.toUpperCase() === 'SYSTEM') {
    return true;
  }

  if (
    userProfileDarkModeValue.toUpperCase() === 'SPACE_DEFAULT' &&
    uiSettingsDarkModeValue.toUpperCase() === 'SYSTEM'
  ) {
    return true;
  }

  return false;
};

const isUnauthenticated = (http: InternalHttpStart) => {
  const { anonymousPaths } = http;
  return anonymousPaths.isAnonymous(window.location.pathname);
};

const doHandle = async ({
  http,
  coreStart,
  uiSettings,
}: {
  http: InternalHttpStart;
  uiSettings: IUiSettingsClient;
  coreStart: {
    i18n: I18nStart;
    theme: ThemeServiceStart;
    userProfile: UserProfileService;
  };
}) => {
  if (!browsersSupportsSystemTheme()) return false;
  if (isUnauthenticated(http)) return false;

  const userProfile = await coreStart.userProfile.getCurrent<{
    userSettings: { darkMode?: string };
  }>({
    dataPath: 'userSettings',
  });
  const { userSettings } = userProfile.data;

  if (!doSyncWithSystem(userSettings, uiSettings.get('theme:darkMode'))) return false;

  return true;
};

export async function handleSystemColorModeChange({
  notifications,
  uiSettings,
  coreStart,
  stop$,
  http,
}: {
  notifications: NotificationsStart;
  http: InternalHttpStart;
  uiSettings: IUiSettingsClient;
  coreStart: {
    i18n: I18nStart;
    theme: ThemeServiceStart;
    userProfile: UserProfileService;
  };
  stop$: Observable<void>;
}) {
  if (!(await doHandle({ http, uiSettings, coreStart }))) {
    return;
  }

  let currentDarkModeValue: boolean | undefined;
  const matchMedia = window.matchMedia('(prefers-color-scheme: dark)');

  const onDarkModeChange = ({ matches: isDarkMode }: { matches: boolean }) => {
    if (currentDarkModeValue === undefined) {
      // The current value can only be set on page reload as that's the moment when
      // we actually apply set the dark/light color mode of the page.
      currentDarkModeValue = isDarkMode;
    } else if (currentDarkModeValue !== isDarkMode) {
      notifications.toasts.addInfo(
        {
          title: i18n.translate('core.ui.chrome.appearanceChange.successNotificationTitle', {
            defaultMessage: 'System color mode updated',
          }),
          text: mountReactNode(
            <>
              <p>
                {i18n.translate('core.ui.chrome.appearanceChange.successNotificationText', {
                  defaultMessage: 'Reload the page to see the changes',
                })}
              </p>
              <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiButton
                    size="s"
                    onClick={() => window.location.reload()}
                    data-test-subj="windowReloadButton"
                  >
                    {i18n.translate(
                      'core.ui.chrome.appearanceChange.requiresPageReloadButtonLabel',
                      {
                        defaultMessage: 'Reload page',
                      }
                    )}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </>
          ),
        },
        { toastLifeTimeMs: Infinity } // leave it on until discard or page reload
      );
    }
  };

  onDarkModeChange(matchMedia);

  matchMedia.addEventListener('change', onDarkModeChange);

  stop$.pipe(take(1)).subscribe(() => {
    matchMedia.removeEventListener('change', onDarkModeChange);
  });
}
