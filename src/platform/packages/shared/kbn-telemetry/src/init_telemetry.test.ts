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
    getConfiguration: jest.fn(),
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

  describe('APM and OTel conflict detection', () => {
    test('throws when APM is active (default) and OTel tracing is enabled', () => {
      const apmConfig = new ApmConfiguration(
        REPO_ROOT,
        { telemetry: { tracing: { enabled: true, sample_rate: 1, exporters: [] } } },
        false
      );

      const { loadConfiguration } = jest.requireMock('@kbn/apm-config-loader');
      loadConfiguration.mockImplementationOnce(() => apmConfig);

      expect(() => initTelemetry([], REPO_ROOT, false, 'test-service')).toThrow(
        'Elastic APM and OpenTelemetry tracing cannot be enabled simultaneously.'
      );
    });

    test('throws when APM is explicitly active and OTel tracing is enabled', () => {
      const apmConfig = new ApmConfiguration(
        REPO_ROOT,
        {
          elastic: { apm: { active: true } },
          telemetry: { tracing: { enabled: true, sample_rate: 1, exporters: [] } },
        },
        false
      );

      const { loadConfiguration } = jest.requireMock('@kbn/apm-config-loader');
      loadConfiguration.mockImplementationOnce(() => apmConfig);

      expect(() => initTelemetry([], REPO_ROOT, false, 'test-service')).toThrow(
        'Elastic APM and OpenTelemetry tracing cannot be enabled simultaneously.'
      );
    });

    test('does not throw when APM is disabled and OTel tracing is enabled', () => {
      const apmConfig = new ApmConfiguration(
        REPO_ROOT,
        {
          telemetry: { tracing: { enabled: true, sample_rate: 1, exporters: [] } },
        },
        false
      );

      // CI sets ELASTIC_APM_ACTIVE=true via env vars, which would override the active:false above.
      // We spy on getConfig to ensure the test is isolated from the environment.
      jest
        .spyOn(apmConfig, 'getConfig')
        .mockReturnValue({ active: false, contextPropagationOnly: false });

      const { loadConfiguration } = jest.requireMock('@kbn/apm-config-loader');
      loadConfiguration.mockImplementationOnce(() => apmConfig);

      expect(() => initTelemetry([], REPO_ROOT, false, 'test-service')).not.toThrow();
    });

    test('does not throw when APM is active and OTel tracing is disabled (default)', () => {
      const apmConfig = new ApmConfiguration(REPO_ROOT, {}, false);

      const { loadConfiguration } = jest.requireMock('@kbn/apm-config-loader');
      loadConfiguration.mockImplementationOnce(() => apmConfig);

      expect(() => initTelemetry([], REPO_ROOT, false, 'test-service')).not.toThrow();
    });
  });

  describe('resource attributes', () => {
    test('ensure naming consistency', () => {
      const apmConfig = new ApmConfiguration(
        REPO_ROOT,
        {
          elastic: { apm: { environment: 'test-environment' } },
          server: { uuid: 'test-kibana-uuid' },
        },
        false
      );

      const { loadConfiguration, getConfiguration } = jest.requireMock('@kbn/apm-config-loader');
      loadConfiguration.mockImplementationOnce(() => apmConfig);
      getConfiguration.mockImplementationOnce(() => apmConfig.getConfig('test-service'));

      const resourceFromAttributesSpy = jest.spyOn(resources, 'resourceFromAttributes');

      initTelemetry([], REPO_ROOT, false, 'test-service');

      expect(getConfiguration).toHaveBeenCalledWith('test-service');
      expect(resourceFromAttributesSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          // Using expect.objectContaining to ignore other attributes introduced by CI adding apmConfig.globalLabels
          'service.name': 'test-service',
          'service.version': PKG_JSON.version,
          'service.instance.id': expect.any(String),
          'deployment.environment.name': apmConfig.getConfig('test-service').environment, // using this reference because CI overrides the config via environment vars
          git_rev: expect.any(String),
          'telemetry.sdk.language': 'nodejs',
        })
      );
    });

    test('uses the provided serviceName (not a hardcoded "kibana") to look up APM config', () => {
      const { loadConfiguration, getConfiguration } = jest.requireMock('@kbn/apm-config-loader');
      loadConfiguration.mockImplementationOnce(() => new ApmConfiguration(REPO_ROOT, {}, false));
      getConfiguration.mockImplementationOnce(() => ({
        serviceName: 'my-worker',
        serviceVersion: '1.2.3',
        environment: 'staging',
      }));

      const resourceFromAttributesSpy = jest.spyOn(resources, 'resourceFromAttributes');

      initTelemetry([], REPO_ROOT, false, 'my-worker');

      expect(getConfiguration).toHaveBeenCalledWith('my-worker');
      expect(resourceFromAttributesSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          'service.name': 'my-worker',
          'service.version': '1.2.3',
          'deployment.environment.name': 'staging',
        })
      );
    });

    test('does not emit literal "null" or "undefined" strings for nullish globalLabels entries', () => {
      const { loadConfiguration, getConfiguration } = jest.requireMock('@kbn/apm-config-loader');
      loadConfiguration.mockImplementationOnce(() => new ApmConfiguration(REPO_ROOT, {}, false));
      getConfiguration.mockImplementationOnce(() => ({
        serviceName: 'test-service',
        globalLabels: {
          validLabel: 'ok',
          nullLabel: null,
          undefinedLabel: undefined,
        },
      }));

      const resourceFromAttributesSpy = jest.spyOn(resources, 'resourceFromAttributes');

      initTelemetry([], REPO_ROOT, false, 'test-service');

      const capturedAttrs = resourceFromAttributesSpy.mock.calls[0][0];
      expect(capturedAttrs).toMatchObject({ validLabel: 'ok', 'labels.validLabel': 'ok' });
      expect(capturedAttrs).not.toMatchObject({ nullLabel: 'null' });
      expect(capturedAttrs).not.toMatchObject({ 'labels.nullLabel': 'null' });
      expect(capturedAttrs).not.toMatchObject({ undefinedLabel: 'undefined' });
      expect(capturedAttrs).not.toMatchObject({ 'labels.undefinedLabel': 'undefined' });
    });
  });
});
