/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FeatureFlagsStart } from '@kbn/core-feature-flags-browser';

export const NEXT_CHROME_FEATURE_FLAG_KEY = 'core.chrome.next';
export const NEXT_CHROME_SESSION_STORAGE_KEY = 'dev.core.chrome.next';

export const DESIGN_EXPLORATION_FEATURE_FLAG_KEY = 'core.chrome.designExploration';

export const DESIGN_EXPLORATION_VARIANT_SESSION_KEY = 'dev.core.chrome.designExploration.variant';

export const DEFAULT_DESIGN_EXPLORATION_VARIANT_ID = 'target';

export interface DesignExplorationVariantOption {
  id: string;
  label: string;
}

/** Keep in sync with design exploration variant style files in @kbn/ui-chrome-layout. */
export const DESIGN_EXPLORATION_VARIANT_OPTIONS: DesignExplorationVariantOption[] = [
  { id: 'baseline', label: 'Baseline' },
  { id: 'verbana', label: 'Verbana' },
  { id: 'linbana', label: 'Linbana' },
  { id: 'attbana', label: 'Attbana' },
  { id: 'interbana', label: 'Interbana' },
  { id: 'nirbana', label: 'Nirbana' },
  { id: 'target', label: 'Target' },
];

type FeatureFlagsBooleanReader = Pick<FeatureFlagsStart, 'getBooleanValue'>;

const isNextChromeFeatureFlagEnabled = (featureFlags: FeatureFlagsBooleanReader): boolean =>
  featureFlags.getBooleanValue(NEXT_CHROME_FEATURE_FLAG_KEY, true);

export const isNextChrome = (featureFlags: FeatureFlagsBooleanReader): boolean => {
  if (!isNextChromeFeatureFlagEnabled(featureFlags)) {
    return false;
  }

  try {
    const override = sessionStorage.getItem(NEXT_CHROME_SESSION_STORAGE_KEY);
    return override === null ? true : override === 'true';
  } catch {
    return true;
  }
};

export const toggleNextChrome = (featureFlags: FeatureFlagsBooleanReader): void => {
  if (!isNextChromeFeatureFlagEnabled(featureFlags)) {
    return;
  }

  const next = !isNextChrome(featureFlags);
  sessionStorage.setItem(NEXT_CHROME_SESSION_STORAGE_KEY, String(next));
  window.location.reload();
};

/**
 * POC: visual design exploration chrome overrides (throwaway, not intended for merge).
 * Enable via `feature_flags.overrides.core.chrome.designExploration: true` in kibana.dev.yml.
 * Requires Chrome Next — see grid layout gating.
 */
export const isDesignExploration = (featureFlags: FeatureFlagsBooleanReader): boolean =>
  featureFlags.getBooleanValue(DESIGN_EXPLORATION_FEATURE_FLAG_KEY, false);

export const isDesignExplorationVariantId = (variantId: string): boolean =>
  DESIGN_EXPLORATION_VARIANT_OPTIONS.some(({ id }) => id === variantId);

export const getDesignExplorationVariant = (): string => {
  try {
    const storedVariantId = sessionStorage.getItem(DESIGN_EXPLORATION_VARIANT_SESSION_KEY);
    if (storedVariantId && isDesignExplorationVariantId(storedVariantId)) {
      return storedVariantId;
    }
  } catch {
    // ignore sessionStorage access errors
  }

  return DEFAULT_DESIGN_EXPLORATION_VARIANT_ID;
};

export const setDesignExplorationVariant = (variantId: string): void => {
  if (!isDesignExplorationVariantId(variantId)) {
    return;
  }

  sessionStorage.setItem(DESIGN_EXPLORATION_VARIANT_SESSION_KEY, variantId);
  window.location.reload();
};
