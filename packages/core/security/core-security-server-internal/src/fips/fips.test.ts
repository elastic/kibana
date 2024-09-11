/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
    it('should return `true` if config.experimental.fipsMode.enabled is `true`', () => {
      securityConfig = { experimental: { fipsMode: { enabled: true } } };

      expect(isFipsEnabled(securityConfig)).toBe(true);
    });

    it('should return `false` if config.experimental.fipsMode.enabled is `false`', () => {
      securityConfig = { experimental: { fipsMode: { enabled: false } } };

      expect(isFipsEnabled(securityConfig)).toBe(false);
    });

    it('should return `false` if config.experimental.fipsMode.enabled is `undefined`', () => {
      expect(isFipsEnabled(securityConfig)).toBe(false);
    });
  });

  describe('checkFipsConfig', () => {
    let mockExit: jest.SpyInstance;

    beforeAll(() => {
      mockExit = jest.spyOn(process, 'exit').mockImplementation((exitCode) => {
        throw new Error(`Fake Exit: ${exitCode}`);
      });
    });

    afterAll(() => {
      mockExit.mockRestore();
    });

    it('should log an error message if FIPS mode is misconfigured - xpack.security.experimental.fipsMode.enabled true, Nodejs FIPS mode false', async () => {
      securityConfig = { experimental: { fipsMode: { enabled: true } } };
      const logger = loggingSystemMock.create().get();
      try {
        checkFipsConfig(securityConfig, {}, {}, logger);
      } catch (e) {
        expect(mockExit).toHaveBeenNthCalledWith(1, 78);
      }

      expect(loggingSystemMock.collect(logger).error).toMatchInlineSnapshot(`
                        Array [
                          Array [
                            "Configuration mismatch error. xpack.security.experimental.fipsMode.enabled is set to true and the configured Node.js environment has FIPS disabled",
                          ],
                        ]
                `);
    });

    it('should log an error message if FIPS mode is misconfigured - xpack.security.experimental.fipsMode.enabled false, Nodejs FIPS mode true', async () => {
      mockGetFipsFn.mockImplementationOnce(() => {
        return 1;
      });

      securityConfig = { experimental: { fipsMode: { enabled: false } } };
      const logger = loggingSystemMock.create().get();

      try {
        checkFipsConfig(securityConfig, {}, {}, logger);
      } catch (e) {
        expect(mockExit).toHaveBeenNthCalledWith(1, 78);
      }

      expect(loggingSystemMock.collect(logger).error).toMatchInlineSnapshot(`
                        Array [
                          Array [
                            "Configuration mismatch error. xpack.security.experimental.fipsMode.enabled is set to false and the configured Node.js environment has FIPS enabled",
                          ],
                        ]
                `);
    });

    it('should log an info message if FIPS mode is properly configured - xpack.security.experimental.fipsMode.enabled true, Nodejs FIPS mode true', async () => {
      mockGetFipsFn.mockImplementationOnce(() => {
        return 1;
      });

      securityConfig = { experimental: { fipsMode: { enabled: true } } };
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

      beforeAll(function () {
        mockGetFipsFn.mockImplementationOnce(() => {
          return 1;
        });

        securityConfig = { experimental: { fipsMode: { enabled: true } } };
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

        try {
          checkFipsConfig(securityConfig, elasticsearchConfig, serverConfig, logger);
        } catch (e) {
          expect(mockExit).toHaveBeenNthCalledWith(1, 78);
        }

        expect(loggingSystemMock.collect(logger).error).toMatchInlineSnapshot(`
                        Array [
                          Array [
                            "Configuration mismatch error: elasticsearch.ssl.keystore.path is set, PKCS12 configurations are not allowed while running in FIPS mode.",
                          ],
                          Array [
                            "Configuration mismatch error: elasticsearch.ssl.truststore.path is set, PKCS12 configurations are not allowed while running in FIPS mode.",
                          ],
                          Array [
                            "Configuration mismatch error: server.ssl.keystore.path is set, PKCS12 configurations are not allowed while running in FIPS mode.",
                          ],
                          Array [
                            "Configuration mismatch error: server.ssl.truststore.path is set, PKCS12 configurations are not allowed while running in FIPS mode.",
                          ],
                        ]
                `);
      });
    });
  });
});
