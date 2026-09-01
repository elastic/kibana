/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createTestEnv, rawConfigServiceMock } from '@kbn/config-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { ConfigService } from '@kbn/config';
import { config } from './config';
import type { TelemetryConfigType } from './config';
import { firstValueFrom } from 'rxjs';

const validateConfig = async (telemetrySettings: Record<string, unknown> = {}) => {
  const configService = new ConfigService(
    rawConfigServiceMock.create({ rawConfig: { telemetry: telemetrySettings } }),
    createTestEnv(),
    loggerMock.create()
  );
  configService.setSchema('telemetry', config.schema);
  Object.entries(config.metaSettings || {}).forEach(([metaSetting, metaSettingValue]) => {
    configService.addMetaSetting(metaSetting, metaSettingValue);
  });

  await configService.validate();

  const telemetry = await firstValueFrom(configService.atPath<TelemetryConfigType>('telemetry'));

  return { telemetry };
};

describe('config', () => {
  const baseContext = {
    dist: true,
    serverless: false,
  };

  describe('expect different defaults', () => {
    test('on non-distributable', () => {
      expect(config.schema.validate({}, { ...baseContext, dist: false })).toEqual(
        expect.objectContaining({
          sendUsageTo: 'staging',
        })
      );
    });

    test('on distributable', () => {
      expect(config.schema.validate({}, { ...baseContext, dist: true })).toEqual(
        expect.objectContaining({
          sendUsageTo: 'prod',
        })
      );
    });

    test('on non-serverless', () => {
      expect(config.schema.validate({}, { ...baseContext, serverless: false })).toEqual(
        expect.objectContaining({
          appendServerlessChannelsSuffix: false,
        })
      );
    });

    test('on serverless', () => {
      expect(config.schema.validate({}, { ...baseContext, serverless: true })).toEqual(
        expect.objectContaining({
          appendServerlessChannelsSuffix: true,
        })
      );
    });
  });

  describe('appendServerlessChannelsSuffix', () => {
    test.each([true, false])(
      'do not allow changing the default value (serverless: %p)',
      (serverless) => {
        expect(() =>
          config.schema.validate(
            { appendServerlessChannelsSuffix: !serverless },
            { ...baseContext, serverless }
          )
        ).toThrow();
      }
    );
  });

  describe('deprecations: telemetry.enabled', () => {
    describe('when telemetry.enabled is set to a falsy value, the plugin stays enabled and telemetry is opted out', () => {
      test.each([false, 'false', 'False', 'FALSE'])(
        'migrates telemetry.enabled: %p → removes enabled, sets optIn and allowChangingOptInStatus to false',
        async (enabledValue) => {
          const validated = await validateConfig({ enabled: enabledValue });

          expect(validated.telemetry.optIn).toBe(false);
          expect(validated.telemetry.allowChangingOptInStatus).toBe(false);
        }
      );

      test.each([false, 'false', 'False', 'FALSE'])(
        'also disables tracing and metrics when telemetry.enabled: %p',
        async (enabledValue) => {
          const validated = await validateConfig({ enabled: enabledValue });

          const telemetry = validated.telemetry;
          expect(telemetry.tracing?.enabled).toBe(false);
          expect(telemetry.metrics?.enabled).toBe(false);
        }
      );
    });

    describe('when telemetry.enabled is absent or truthy, the deprecation does not fire', () => {
      test('does not modify config when telemetry.enabled is not set', async () => {
        const validated = await validateConfig({});

        expect(validated.telemetry.optIn).toBe(true); // Default value
        expect(validated.telemetry.allowChangingOptInStatus).toBe(true); // Default value
      });

      test.each([true, 'true', 'True', 'TRUE'])(
        'does not modify config when telemetry.enabled: %p',
        async (enabledValue) => {
          const validated = await validateConfig({ enabled: enabledValue });

          expect(validated.telemetry.optIn).toBe(true); // Default value
          expect(validated.telemetry.allowChangingOptInStatus).toBe(true); // Default value
        }
      );
    });
  });
});
