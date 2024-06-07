/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isFeatureFlagSet } from './is_feature_flag_set';

describe('isFeatureFlagSet', () => {
  it('returns true if the feature exists', () => {
    expect(isFeatureFlagSet('test.myFeature')).toBe(true);
  });

  it('returns false if the feature does not exist', () => {
    expect(isFeatureFlagSet('foo')).toBe(false);
  });
});
