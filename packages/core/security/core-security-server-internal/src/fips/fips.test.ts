/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CriticalError } from '@kbn/core-base-server-internal';

const mockGetFipsFn = jest.fn();
jest.mock('crypto', () => ({
  randomBytes: jest.fn(),
  constants: jest.requireActual('crypto').constants,
  get getFips() {
    return mockGetFipsFn;
  },
}));

import { SecurityServiceConfigType } from '../utils';
import { isFipsEnabled, checkFipsConfig } from './fips';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';

describe('fips', () => {
  let securityConfig: SecurityServiceConfigType;
  describe('#isFipsEnabled', () => {
    it('should return `true` if config.fipsMode.enabled is `true`', () => {
      securityConfig = { fipsMode: { enabled: true } };

      expect(isFipsEnabled(securityConfig)).toBe(true);
    });

    it('should return `false` if config.fipsMode.enabled is `false`', () => {
      securityConfig = { fipsMode: { enabled: false } };

      expect(isFipsEnabled(securityConfig)).toBe(false);
    });

    it('should return `false` if config.fipsMode.enabled is `undefined`', () => {
      expect(isFipsEnabled(securityConfig)).toBe(false);
    });
  });

  describe('checkFipsConfig', () => {
    it('should log an error message if FIPS mode is misconfigured - xpack.security.fipsMode.enabled true, Nodejs FIPS mode false', async () => {
      securityConfig = { fipsMode: { enabled: true } };
      const logger = loggingSystemMock.create().get();
      let fipsException: undefined | CriticalError;
      try {
        checkFipsConfig(securityConfig, {}, {}, logger);
      } catch (e) {
        fipsException = e;
      }

      expect(fipsException).toBeInstanceOf(CriticalError);
      expect(fipsException!.processExitCode).toBe(78);
      expect(fipsException!.message).toEqual(
        'Configuration mismatch error. xpack.security.fipsMode.enabled is set to true and the configured Node.js environment has FIPS disabled'
      );
    });

    it('should log an error message if FIPS mode is misconfigured - xpack.security.fipsMode.enabled false, Nodejs FIPS mode true', async () => {
      mockGetFipsFn.mockImplementationOnce(() => {
        return 1;
      });

      securityConfig = { fipsMode: { enabled: false } };
      const logger = loggingSystemMock.create().get();

      let fipsException: undefined | CriticalError;
      try {
        checkFipsConfig(securityConfig, {}, {}, logger);
      } catch (e) {
        fipsException = e;
      }
      expect(fipsException).toBeInstanceOf(CriticalError);
      expect(fipsException!.processExitCode).toBe(78);
      expect(fipsException!.message).toEqual(
        'Configuration mismatch error. xpack.security.fipsMode.enabled is set to false and the configured Node.js environment has FIPS enabled'
      );
    });

    it('should log an info message if FIPS mode is properly configured - xpack.security.fipsMode.enabled true, Nodejs FIPS mode true', async () => {
      mockGetFipsFn.mockImplementationOnce(() => {
        return 1;
      });

      securityConfig = { fipsMode: { enabled: true } };
      const logger = loggingSystemMock.create().get();

      try {
        checkFipsConfig(securityConfig, {}, {}, logger);
      } catch (e) {
        logger.error('Should not throw error!');
      }

      expect(loggingSystemMock.collect(logger).info).toMatchInlineSnapshot(`
                        Array [
                          Array [
                            "Kibana is running in FIPS mode.",
                          ],
                        ]
                `);
    });

    describe('PKCS12 Config settings', function () {
      let serverConfig = {};
      let elasticsearchConfig = {};

      beforeEach(function () {
        mockGetFipsFn.mockImplementationOnce(() => {
          return 1;
        });

        securityConfig = { fipsMode: { enabled: true } };
      });

      afterEach(function () {
        serverConfig = {};
        elasticsearchConfig = {};
      });

      it('should log an error message for each PKCS12 configuration option that is set', async () => {
        elasticsearchConfig = {
          ssl: {
            keystore: {
              path: '/test',
            },
            truststore: {
              path: '/test',
            },
          },
        };

        serverConfig = {
          ssl: {
            keystore: {
              path: '/test',
            },
            truststore: {
              path: '/test',
            },
          },
        };

        const logger = loggingSystemMock.create().get();

        let fipsException: undefined | CriticalError;
        try {
          checkFipsConfig(securityConfig, elasticsearchConfig, serverConfig, logger);
        } catch (e) {
          fipsException = e;
        }

        expect(fipsException).toBeInstanceOf(CriticalError);
        expect(fipsException!.processExitCode).toBe(78);
        expect(fipsException!.message).toEqual(
          'Configuration mismatch error: elasticsearch.ssl.keystore.path, elasticsearch.ssl.truststore.path, server.ssl.keystore.path, server.ssl.truststore.path are set, PKCS12 configurations are not allowed while running in FIPS mode.'
        );
      });

      it('should log an error message for one PKCS12 configuration option that is set', async () => {
        elasticsearchConfig = {
          ssl: {
            keystore: {
              path: '/test',
            },
          },
        };

        serverConfig = {};

        const logger = loggingSystemMock.create().get();

        let fipsException: undefined | CriticalError;
        try {
          checkFipsConfig(securityConfig, elasticsearchConfig, serverConfig, logger);
        } catch (e) {
          fipsException = e;
        }

        expect(fipsException).toBeInstanceOf(CriticalError);
        expect(fipsException!.processExitCode).toBe(78);
        expect(fipsException!.message).toEqual(
          'Configuration mismatch error: elasticsearch.ssl.keystore.path is set, PKCS12 configurations are not allowed while running in FIPS mode.'
        );
      });
    });
  });
});
