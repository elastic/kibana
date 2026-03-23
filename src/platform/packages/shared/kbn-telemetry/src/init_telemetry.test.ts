/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('@opentelemetry/instrumentation', () => {
  const originalPkg = jest.requireActual('@opentelemetry/instrumentation');

  return {
    ...originalPkg,
    registerInstrumentations: jest.fn().mockImplementation(originalPkg.registerInstrumentations),
  };
});

jest.mock('@kbn/apm-config-loader', () => {
  const originalPkg = jest.requireActual('@kbn/apm-config-loader');

  return {
    ...originalPkg,
    loadConfiguration: jest.fn(),
  };
});

import { REPO_ROOT, PKG_JSON } from '@kbn/repo-info';
import { ApmConfiguration } from '@kbn/apm-config-loader/src/config';
import { resources } from '@elastic/opentelemetry-node/sdk';
import { initTelemetry } from '..';

describe('initTelemetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('resource attributes', () => {
    test('ensure naming consistency', () => {
      const apmConfig = new ApmConfiguration(
        REPO_ROOT,
        { elastic: { apm: { environment: 'test-environment' } } },
        false
      );

      const { loadConfiguration } = jest.requireMock('@kbn/apm-config-loader');
      loadConfiguration.mockImplementationOnce(() => apmConfig);

      const resourceFromAttributesSpy = jest.spyOn(resources, 'resourceFromAttributes');

      initTelemetry([], REPO_ROOT, false, 'test-service');

      expect(resourceFromAttributesSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          // Using expect.objectContaining to ignore other attributes introduced by CI adding apmConfig.globalLabels
          'service.name': 'test-service',
          'service.version': PKG_JSON.version,
          'service.instance.id': undefined,
          'deployment.environment.name': apmConfig.getConfig('test-service').environment, // using this reference because CI overrides the config via environment vars
          git_rev: expect.any(String),
        })
      );
    });
  });
});
