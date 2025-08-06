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

import { REPO_ROOT } from '@kbn/repo-info';
import { initTelemetry } from '..';
import type { DeepPartial } from '@kbn/utility-types';
import { ApmConfiguration } from '@kbn/apm-config-loader/src/config';

describe('initTelemetry', () => {
  describe('auto-instrumentations', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test.each<[string, DeepPartial<TelemetryConfig>, string[]]>([
      ['telemetry is disabled', { enabled: false }, []],
      [
        'telemetry is enabled but tracing and metrics are disabled',
        { enabled: true, tracing: { enabled: false }, metrics: { enabled: false } },
        [],
      ],
      [
        'only telemetry tracing is enabled',
        { enabled: true, tracing: { enabled: true }, metrics: { enabled: false } },
        [],
      ],
      [
        'only telemetry metrics is enabled',
        { enabled: true, tracing: { enabled: false }, metrics: { enabled: true } },
        [
          // This test will scream at us if any of these have been removed or renamed and no-longer registered
          '@opentelemetry/instrumentation-runtime-node',
        ],
      ],
    ])('validate registered instrumentations when %s', (_, config, expected) => {
      const { loadConfiguration } = jest.requireMock('@kbn/apm-config-loader');
      loadConfiguration.mockImplementation(
        () => new ApmConfiguration(REPO_ROOT, { telemetry: config as TelemetryConfig }, false)
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
