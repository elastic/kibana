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
import {
  ATTR_PROCESS_COMMAND_ARGS,
  ATTR_PROCESS_EXECUTABLE_NAME,
  ATTR_PROCESS_PID,
} from '@opentelemetry/semantic-conventions/incubating';
import { initTelemetry } from '..';

const PROCESS_ARGS_COUNT = 'process.args_count';

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

  describe('process command args', () => {
    const initAndGetDetectedResource = async () => {
      const apmConfig = new ApmConfiguration(REPO_ROOT, {}, false);
      const { loadConfiguration } = jest.requireMock('@kbn/apm-config-loader');
      loadConfiguration.mockImplementationOnce(() => apmConfig);

      const detectResourcesSpy = jest.spyOn(resources, 'detectResources');
      initTelemetry([], REPO_ROOT, false, 'test-service');

      const resource = detectResourcesSpy.mock.results[0].value;
      await resource.waitForAsyncAttributes?.();
      return resource;
    };

    afterEach(() => {
      jest.restoreAllMocks();
    });

    test('drops process.command_args and records how many arguments were detected', async () => {
      const commandArgs = ['node', '--dev', 'src/cli/dist'];
      jest.spyOn(resources.processDetector, 'detect').mockReturnValue({
        attributes: {
          [ATTR_PROCESS_PID]: 123,
          [ATTR_PROCESS_EXECUTABLE_NAME]: 'node',
          [ATTR_PROCESS_COMMAND_ARGS]: commandArgs,
        },
      });

      const resource = await initAndGetDetectedResource();

      expect(resource.attributes).not.toHaveProperty(ATTR_PROCESS_COMMAND_ARGS);
      expect(resource.attributes[PROCESS_ARGS_COUNT]).toBe(commandArgs.length);
      expect(resource.attributes[ATTR_PROCESS_PID]).toBe(123);
      expect(resource.attributes[ATTR_PROCESS_EXECUTABLE_NAME]).toBe('node');
    });

    test('records a count of zero when the detected command args are empty', async () => {
      jest.spyOn(resources.processDetector, 'detect').mockReturnValue({
        attributes: {
          [ATTR_PROCESS_COMMAND_ARGS]: [],
        },
      });

      const resource = await initAndGetDetectedResource();

      expect(resource.attributes).not.toHaveProperty(ATTR_PROCESS_COMMAND_ARGS);
      expect(resource.attributes[PROCESS_ARGS_COUNT]).toBe(0);
    });

    test('does not set process.args_count when command args are absent', async () => {
      jest.spyOn(resources.processDetector, 'detect').mockReturnValue({
        attributes: {
          [ATTR_PROCESS_PID]: 123,
        },
      });

      const resource = await initAndGetDetectedResource();

      expect(resource.attributes).not.toHaveProperty(ATTR_PROCESS_COMMAND_ARGS);
      expect(resource.attributes).not.toHaveProperty(PROCESS_ARGS_COUNT);
      expect(resource.attributes[ATTR_PROCESS_PID]).toBe(123);
    });

    test('drops non-array command args without recording a count', async () => {
      jest.spyOn(resources.processDetector, 'detect').mockReturnValue({
        attributes: {
          [ATTR_PROCESS_COMMAND_ARGS]: 'node --dev src/cli/dist',
        },
      });

      const resource = await initAndGetDetectedResource();

      expect(resource.attributes).not.toHaveProperty(ATTR_PROCESS_COMMAND_ARGS);
      expect(resource.attributes).not.toHaveProperty(PROCESS_ARGS_COUNT);
    });

    test('strips command args reported by the real process detector', async () => {
      const resource = await initAndGetDetectedResource();

      const expectedCount = [process.argv[0], ...process.execArgv, ...process.argv.slice(1)].length;

      expect(resource.attributes).not.toHaveProperty(ATTR_PROCESS_COMMAND_ARGS);
      expect(resource.attributes[PROCESS_ARGS_COUNT]).toBe(expectedCount);
      expect(resource.attributes[ATTR_PROCESS_PID]).toBe(process.pid);
    });
  });
});
