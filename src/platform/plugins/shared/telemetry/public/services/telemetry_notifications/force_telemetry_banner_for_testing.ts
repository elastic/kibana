/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * **Local testing only.** In the browser devtools console run:
 *
 * `localStorage.setItem('kbn.dev.forceTelemetryOptInBanner', 'true')` then reload or switch apps.
 *
 * Clear with `localStorage.removeItem('kbn.dev.forceTelemetryOptInBanner')`.
 *
 * While set, the global telemetry opt-in notice banner is shown whenever Kibana would
 * normally evaluate it, and **dismissing the banner does not call the server** (so you
 * can repeat without resetting the `telemetry` saved object).
 */
export const FORCE_TELEMETRY_OPT_IN_BANNER_LOCAL_STORAGE_KEY = 'kbn.dev.forceTelemetryOptInBanner';

export function isForceTelemetryOptInBannerForTesting(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  try {
    return window.localStorage.getItem(FORCE_TELEMETRY_OPT_IN_BANNER_LOCAL_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}
