/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MetricsExperienceClient } from './api';
import { MetricsExperiencePlugin } from './plugin';
import { coreMock } from '@kbn/core/public/mocks';

jest.mock('./api', () => ({
  createMetricsExperienceClient: jest.fn().mockReturnValue({} as MetricsExperienceClient),
}));

describe('Metrics Experience plugin', () => {
  let plugin: MetricsExperiencePlugin;

  beforeEach(() => {
    jest.clearAllMocks();

    plugin = new MetricsExperiencePlugin();
    plugin.setup(coreMock.createSetup());
  });

  describe('start()', () => {
    it('metricsExperienceClient is available when feature flag is enabled', () => {
      const start = plugin.start({
        featureFlags: { getBooleanValue: jest.fn().mockReturnValue(true) },
      } as any);

      expect(start.metricsExperienceClient).toEqual({});
    });

    it('metricsExperienceClient is undefined when feature flag is disabled', () => {
      const start = plugin.start({
        featureFlags: { getBooleanValue: jest.fn().mockReturnValue(false) },
      } as any);

      expect(start.metricsExperienceClient).toBeUndefined();
    });
  });
});
