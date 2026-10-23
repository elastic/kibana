/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BROWSER_PROFILES, pickBrowserProfile } from './browser_profiles';
import { EdotBrowserApp, type EdotBrowserAppOptions } from './edot_browser_app';
import { idleTab, session } from './edot_browser_session';
import { HEALTH_PROFILES } from './health_profiles';

export type { BrowserProfileId } from './browser_profiles';
export type { HealthProfileName } from './health_profiles';
export type { EdotBrowserClientOptions } from './edot_browser_client';
export type { EdotBrowserSpanDocument } from './edot_browser_span';
export type {
  EdotBrowserDocument,
  EdotBrowserEvent,
  EdotBrowserSite,
} from './edot_browser_session';

export const edotBrowser = {
  app: (options: EdotBrowserAppOptions): EdotBrowserApp => new EdotBrowserApp(options),
  session,
  idleTab,
  browserProfiles: BROWSER_PROFILES,
  pickBrowserProfile,
  healthProfiles: HEALTH_PROFILES,
};
