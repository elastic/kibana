/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FeatureFlagsStart } from '@kbn/core-feature-flags-browser';

export { ChromeNextToggle } from './chrome_next_toggle';

export const NEXT_CHROME_FEATURE_FLAG_KEY = 'core.chrome.next';
export const NEXT_CHROME_SESSION_STORAGE_KEY = 'dev.core.chrome.next';

type FeatureFlagsBooleanReader = Pick<FeatureFlagsStart, 'getBooleanValue'>;

export const isNextChrome = (featureFlags: FeatureFlagsBooleanReader): boolean => {
  try {
    const override = sessionStorage.getItem(NEXT_CHROME_SESSION_STORAGE_KEY);
    if (override !== null) {
      return override === 'true';
    }
  } catch {
    // sessionStorage may be unavailable
  }
  return featureFlags.getBooleanValue(NEXT_CHROME_FEATURE_FLAG_KEY, false);
};

export const toggleNextChrome = (featureFlags: FeatureFlagsBooleanReader): void => {
  const next = !isNextChrome(featureFlags);
  sessionStorage.setItem(NEXT_CHROME_SESSION_STORAGE_KEY, String(next));
  window.location.reload();
};
