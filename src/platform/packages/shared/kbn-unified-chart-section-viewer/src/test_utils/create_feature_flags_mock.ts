/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { of } from 'rxjs';
import type { FeatureFlagsStart } from '@kbn/core/public';
import { coreFeatureFlagsMock } from '@kbn/core-feature-flags-browser-mocks';
import type { FeatureFlag } from '../common/constants';

export type FeatureFlagOverrides = Partial<Record<FeatureFlag, boolean>>;

/**
 * Builds a `FeatureFlagsStart` mock for unit tests, scoped by flag name.
 *
 *
 * @example
 * const featureFlags = createFeatureFlagsMock({
 *   [FEATURE_FLAGS.IS_EDIT_GRID_SETTINGS_ENABLED]: true,
 * });
 */
export const createFeatureFlagsMock = (
  overrides: FeatureFlagOverrides = {}
): jest.Mocked<FeatureFlagsStart> => {
  const featureFlags = coreFeatureFlagsMock.createStart();
  const resolve = (flagName: string, fallbackValue: boolean) =>
    flagName in overrides ? overrides[flagName as FeatureFlag]! : fallbackValue;

  featureFlags.getBooleanValue$.mockImplementation((flagName, fallbackValue) =>
    of(resolve(flagName, fallbackValue))
  );
  featureFlags.getBooleanValue.mockImplementation((flagName, fallbackValue) =>
    resolve(flagName, fallbackValue)
  );

  return featureFlags;
};
