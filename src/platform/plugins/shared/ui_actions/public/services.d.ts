/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  AnalyticsServiceStart,
  I18nStart,
  ThemeServiceSetup,
  UserProfileService,
} from '@kbn/core/public';
export declare const getAnalytics: import('@kbn/kibana-utils-plugin/common').Get<AnalyticsServiceStart>;
export const setAnalytics: import('@kbn/kibana-utils-plugin/common').Set<AnalyticsServiceStart>;
export declare const getI18n: import('@kbn/kibana-utils-plugin/common').Get<I18nStart>;
export const setI18n: import('@kbn/kibana-utils-plugin/common').Set<I18nStart>;
export declare const getNotifications: import('@kbn/kibana-utils-plugin/common').Get<
  import('@kbn/core/public').NotificationsStart
>;
export const setNotifications: import('@kbn/kibana-utils-plugin/common').Set<
  import('@kbn/core/public').NotificationsStart
>;
export declare const getTheme: import('@kbn/kibana-utils-plugin/common').Get<ThemeServiceSetup>;
export const setTheme: import('@kbn/kibana-utils-plugin/common').Set<ThemeServiceSetup>;
export declare const getUserProfile: import('@kbn/kibana-utils-plugin/common').Get<UserProfileService>;
export const setUserProfile: import('@kbn/kibana-utils-plugin/common').Set<UserProfileService>;
