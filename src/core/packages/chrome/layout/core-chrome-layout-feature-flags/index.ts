/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FeatureFlagsStart } from '@kbn/core-feature-flags-browser';

export type LayoutFeatureFlag = 'legacy-fixed' | 'grid';
export const LAYOUT_FEATURE_FLAG_KEY = 'core.chrome.layoutType';
export const LAYOUT_DEBUG_FEATURE_FLAG_KEY = 'core.chrome.layoutDebug';

export const getLayoutVersion = (featureFlags: FeatureFlagsStart): LayoutFeatureFlag => {
  const featureFlag = featureFlags.getStringValue<LayoutFeatureFlag>(
    LAYOUT_FEATURE_FLAG_KEY,
    'grid'
  );
  if (featureFlag !== 'legacy-fixed' && featureFlag !== 'grid') {
    throw new Error(
      `Invalid layout feature flag value: ${featureFlag}. Expected 'legacy-fixed' or 'grid'.`
    );
  }
  return featureFlag;
};

export const getLayoutDebugFlag = (featureFlags: FeatureFlagsStart): boolean => {
  return featureFlags.getBooleanValue(LAYOUT_DEBUG_FEATURE_FLAG_KEY, false);
};
