/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TelemetryConfig } from '@kbn/telemetry-config';
import type { Instrumentation } from '@opentelemetry/instrumentation';
import type { MonitoringCollectionConfig } from '@kbn/metrics-config';

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
import type { DeepPartial } from '@kbn/utility-types';
import { ApmConfiguration } from '@kbn/apm-config-loader/src/config';
import { resources } from '@elastic/opentelemetry-node/sdk';
import { initTelemetry } from '..';

interface KibanaRawConfig {
  monitoring_collection?: Partial<MonitoringCollectionConfig>;
  telemetry?: Partial<TelemetryConfig>;
}

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

  describe('auto-instrumentations', () => {
    test.each<[string, DeepPartial<KibanaRawConfig>, string[]]>([
      ['telemetry is disabled', { telemetry: { enabled: false } }, []],
      [
        'telemetry is enabled but tracing and metrics are disabled',
        {
          telemetry: {
            enabled: true,
            tracing: { enabled: false },
            metrics: { enabled: false },
          },
          monitoring_collection: { enabled: false },
        },
        [],
      ],
      [
        'only telemetry tracing is enabled',
        {
          telemetry: { enabled: true, tracing: { enabled: true }, metrics: { enabled: false } },
          monitoring_collection: { enabled: false },
        },
        [],
      ],
      [
        'only telemetry metrics is enabled',
        {
          telemetry: { enabled: true, tracing: { enabled: false }, metrics: { enabled: true } },
          monitoring_collection: { enabled: false },
        },
        [
          // This test will scream at us if any of these have been removed or renamed and no-longer registered
          '@opentelemetry/instrumentation-runtime-node',
        ],
      ],
      [
        'only monitoring collection metrics is enabled',
        {
          telemetry: { enabled: true, tracing: { enabled: false }, metrics: { enabled: false } },
          monitoring_collection: { enabled: true },
        },
        [],
      ],
      [
        'telemetry metrics and monitoring collection metrics are enabled',
        {
          telemetry: { enabled: true, tracing: { enabled: false }, metrics: { enabled: true } },
          monitoring_collection: { enabled: true },
        },
        ['@opentelemetry/instrumentation-runtime-node'],
      ],
    ])('validate registered instrumentations when %s', (_, config, expected) => {
      const { loadConfiguration } = jest.requireMock('@kbn/apm-config-loader');
      loadConfiguration.mockImplementation(
        () => new ApmConfiguration(REPO_ROOT, config as KibanaRawConfig, false)
      );

      initTelemetry([], REPO_ROOT, false, 'test-service');
      const { registerInstrumentations } = jest.requireMock('@opentelemetry/instrumentation');

      if (expected.length > 0) {
        const { instrumentations } = registerInstrumentations.mock.calls[0][0];
        const instrumentationNames = instrumentations.map(
          ({ instrumentationName }: Instrumentation) => instrumentationName
        );
        expect(instrumentationNames).toEqual(expected);
      } else {
        expect(registerInstrumentations).not.toHaveBeenCalled();
      }
    });
  });
});
