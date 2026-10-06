/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { I18nStart } from '@kbn/core-i18n-browser';
import type { ThemeServiceStart } from '@kbn/core-theme-browser';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import { type Observable } from 'rxjs';
import type { InternalHttpStart } from '@kbn/core-http-browser-internal';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { Logger } from '@kbn/logging';
export declare function handleSystemColorModeChange({
  getNotifications,
  uiSettings,
  coreStart,
  stop$,
  http,
  logger,
}: {
  getNotifications: () => Promise<NotificationsStart>;
  http: InternalHttpStart;
  uiSettings: IUiSettingsClient;
  coreStart: {
    i18n: I18nStart;
    theme: ThemeServiceStart;
    userProfile: UserProfileService;
  };
  stop$: Observable<void>;
  logger: Logger;
}): void;
