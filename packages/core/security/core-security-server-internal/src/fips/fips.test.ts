/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
  let config: SecurityServiceConfigType;
  describe('#isFipsEnabled', () => {
    it('should return `true` if config.experimental.fipsMode.enabled is `true`', () => {
      config = { experimental: { fipsMode: { enabled: true } } };

      expect(isFipsEnabled(config)).toBe(true);
    });

    it('should return `false` if config.experimental.fipsMode.enabled is `false`', () => {
      config = { experimental: { fipsMode: { enabled: false } } };

      expect(isFipsEnabled(config)).toBe(false);
    });

    it('should return `false` if config.experimental.fipsMode.enabled is `undefined`', () => {
      expect(isFipsEnabled(config)).toBe(false);
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
      config = { experimental: { fipsMode: { enabled: true } } };
      const logger = loggingSystemMock.create().get();
      try {
        checkFipsConfig(config, logger);
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

      config = { experimental: { fipsMode: { enabled: false } } };
      const logger = loggingSystemMock.create().get();

      try {
        checkFipsConfig(config, logger);
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

      config = { experimental: { fipsMode: { enabled: true } } };
      const logger = loggingSystemMock.create().get();

      try {
        checkFipsConfig(config, logger);
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
  });
});
