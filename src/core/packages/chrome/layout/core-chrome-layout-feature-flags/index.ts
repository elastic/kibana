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
export type LayoutProjectSideNavVersion = 'v1' | 'v2';
export const LAYOUT_PROJECT_SIDENAV_FEATURE_FLAG_KEY = 'core.chrome.projectSideNav';

export const getSideNavVersion = (featureFlags: FeatureFlagsStart): LayoutProjectSideNavVersion => {
  const featureFlag = featureFlags.getStringValue<LayoutProjectSideNavVersion>(
    LAYOUT_PROJECT_SIDENAV_FEATURE_FLAG_KEY,
    'v2'
  );

  // both is temporarily supported hidden option to allow for a smooth transition
  if (featureFlag !== 'v1' && featureFlag !== 'v2' && featureFlag !== 'both') {
    throw new Error(
      `Invalid project side nav feature flag value: ${featureFlag}. Expected 'v1' or 'v2'.`
    );
  }

  return featureFlag;
};

export const getLayoutVersion = (featureFlags: FeatureFlagsStart): LayoutFeatureFlag => {
  const featureFlag = featureFlags.getStringValue<LayoutFeatureFlag>(
    LAYOUT_FEATURE_FLAG_KEY,
    'legacy-fixed'
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
