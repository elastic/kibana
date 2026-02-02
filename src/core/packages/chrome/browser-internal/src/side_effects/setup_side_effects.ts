/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import type { I18nStart } from '@kbn/core-i18n-browser';
import type { ThemeServiceStart } from '@kbn/core-theme-browser';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { InternalHttpStart } from '@kbn/core-http-browser-internal';
import type { NotificationsStart } from '@kbn/core-notifications-browser';

import type { VisibilityState } from '../state/visibility_state';

import { handleEuiFullScreenChanges } from './handle_eui_fullscreen_changes';
import { handleSystemColorModeChange } from './handle_system_colormode_change';

export interface SideEffectsDeps {
  visibility: VisibilityState;
  stop$: Observable<void>;
  getNotifications: () => Promise<NotificationsStart>;
  i18n: I18nStart;
  theme: ThemeServiceStart;
  userProfile: UserProfileService;
  http: InternalHttpStart;
  uiSettings: IUiSettingsClient;
}

/** Sets up chrome side effects that respond to external events. */
export function setupChromeSideEffects({
  visibility,
  stop$,
  getNotifications,
  i18n,
  theme,
  userProfile,
  http,
  uiSettings,
}: SideEffectsDeps): void {
  handleEuiFullScreenChanges({
    isVisible$: visibility.isVisible$,
    setIsVisible: visibility.setIsVisible,
    stop$,
  });

  handleSystemColorModeChange({
    getNotifications,
    coreStart: { i18n, theme, userProfile },
    stop$,
    http,
    uiSettings,
  });
}
