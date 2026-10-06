/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type { I18nStart } from '@kbn/core-i18n-browser';
import type { ThemeServiceStart } from '@kbn/core-theme-browser';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import type { InternalHttpStart } from '@kbn/core-http-browser-internal';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
/** Only exported for tests */
export declare const MISSING_CONFIG_STORAGE_KEY = 'core.warnings.publicBaseUrlMissingDismissed';
interface Deps {
  docLinks: DocLinksStart;
  http: InternalHttpStart;
  notifications: NotificationsStart;
  storage?: Storage;
  location?: Location;
  analytics: AnalyticsServiceStart;
  i18n: I18nStart;
  theme: ThemeServiceStart;
  userProfile: UserProfileService;
}
export declare const setupPublicBaseUrlConfigWarning: ({
  docLinks,
  http,
  notifications,
  storage,
  location,
  ...renderContextDeps
}: Deps) => void;
export {};
