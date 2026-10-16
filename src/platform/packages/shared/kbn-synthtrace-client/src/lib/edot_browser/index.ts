/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EdotBrowserApp, type EdotBrowserAppOptions } from './edot_browser_app';
import { session } from './edot_browser_session';

export { asFloat } from './as_float';
export {
  BROWSER_PROFILES,
  pickBrowserProfile,
  type BrowserProfile,
  type BrowserProfileId,
  type EdotBrowserResourceAttributes,
} from './browser_profiles';
export {
  HEALTH_PROFILES,
  getWebVitalRating,
  type HealthProfile,
  type HealthProfileName,
  type WebVitalName,
  type WebVitalRating,
} from './health_profiles';
export { EdotBrowserApp, type EdotBrowserAppOptions } from './edot_browser_app';
export {
  EdotBrowserClient,
  type EdotBrowserClientOptions,
  type HttpInstrumentation,
  type NavigationTimingType,
  type NavigationTimingValues,
  type ResourceTimingValues,
  type SoftNavigationType,
} from './edot_browser_client';
export { EdotBrowserLog } from './edot_browser_log';
export { EdotBrowserSpan, type EdotBrowserSpanDocument } from './edot_browser_span';
export type {
  EdotBrowserClickTarget,
  EdotBrowserDocument,
  EdotBrowserEvent,
  EdotBrowserExceptionTemplate,
  EdotBrowserPage,
  EdotBrowserRequest,
  EdotBrowserResource,
  EdotBrowserSessionOptions,
  EdotBrowserSite,
} from './edot_browser_session';

export const edotBrowser = {
  app: (options: EdotBrowserAppOptions): EdotBrowserApp => new EdotBrowserApp(options),
  session,
};
