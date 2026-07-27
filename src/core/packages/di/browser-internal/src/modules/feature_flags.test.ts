/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Container, ContainerModule } from 'inversify';
import { injectionServiceMock } from '@kbn/core-di-mocks';
import { CoreStart, FeatureFlags } from '@kbn/core-di-browser';
import { coreFeatureFlagsMock } from '@kbn/core-feature-flags-browser-mocks';
import { loadFeatureFlags } from './feature_flags';

describe('loadFeatureFlags', () => {
  let container: Container;
  let featureFlags: ReturnType<typeof coreFeatureFlagsMock.createStart>;

  beforeEach(() => {
    featureFlags = coreFeatureFlagsMock.createStart();
    container = injectionServiceMock.createStartContract().getContainer();
    container.load(new ContainerModule(loadFeatureFlags));
    container.bind(CoreStart('featureFlags')).toConstantValue(featureFlags);
  });

  it('should resolve the feature flags service', () => {
    expect(container.get(FeatureFlags)).toBe(featureFlags);
  });
});
