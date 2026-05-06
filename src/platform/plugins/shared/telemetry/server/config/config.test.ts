/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { applyDeprecations, configDeprecationFactory } from '@kbn/config';
import { configDeprecationsMock } from '@kbn/core/server/mocks';
import { config } from './config';

const applyConfigDeprecations = (telemetrySettings: Record<string, unknown> = {}) => {
  const deprecationContext = configDeprecationsMock.createContext();
  const deprecations = config.deprecations!(configDeprecationFactory);
  const { config: migrated } = applyDeprecations(
    { telemetry: telemetrySettings },
    deprecations.map((deprecation) => ({
      deprecation,
      path: 'telemetry',
      context: deprecationContext,
    }))
  );
  return migrated as Record<string, Record<string, unknown>>;
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
        (enabledValue) => {
          const migrated = applyConfigDeprecations({ enabled: enabledValue });

          expect(migrated.telemetry.enabled).toBeUndefined();
          expect(migrated.telemetry.optIn).toBe(false);
          expect(migrated.telemetry.allowChangingOptInStatus).toBe(false);
        }
      );

      test.each([false, 'false', 'False', 'FALSE'])(
        'also disables tracing and metrics when telemetry.enabled: %p',
        (enabledValue) => {
          const migrated = applyConfigDeprecations({ enabled: enabledValue });

          const telemetry = migrated.telemetry as Record<string, Record<string, unknown>>;
          expect(telemetry.tracing?.enabled).toBe(false);
          expect(telemetry.metrics?.enabled).toBe(false);
        }
      );
    });

    describe('when telemetry.enabled is absent or truthy, the deprecation does not fire', () => {
      test('does not modify config when telemetry.enabled is not set', () => {
        const migrated = applyConfigDeprecations({});

        expect(migrated.telemetry.enabled).toBeUndefined();
        expect(migrated.telemetry.optIn).toBeUndefined();
        expect(migrated.telemetry.allowChangingOptInStatus).toBeUndefined();
      });

      test.each([true, 'true', 'True', 'TRUE'])(
        'does not modify config when telemetry.enabled: %p',
        (enabledValue) => {
          const migrated = applyConfigDeprecations({ enabled: enabledValue });

          expect(migrated.telemetry.enabled).toBe(enabledValue);
          expect(migrated.telemetry.optIn).toBeUndefined();
          expect(migrated.telemetry.allowChangingOptInStatus).toBeUndefined();
        }
      );
    });
  });
});
