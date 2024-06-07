/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createFeatureFlagService } from './feature_flag_service';

describe('FeatureFlagService', () => {
  it('returns true if the feature exists', () => {
    const featureFlagService = createFeatureFlagService(['test.myFeature']);
    expect(featureFlagService.isFeatureFlagSet('test.myFeature')).toBe(true);
  });

  it('returns false if the feature does not exist', () => {
    const featureFlagService = createFeatureFlagService(['test.myFeature']);
    // @ts-expect-error: foo is not part of the valid feature flags
    expect(featureFlagService.isFeatureFlagSet('foo')).toBe(false);
  });
});
