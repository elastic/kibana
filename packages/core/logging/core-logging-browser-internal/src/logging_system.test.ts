/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BrowserLoggingSystem } from './logging_system';

describe('', () => {
  const timestamp = new Date(Date.UTC(2012, 1, 1, 14, 33, 22, 11));

  let mockConsoleLog: jest.SpyInstance;
  let loggingSystem: BrowserLoggingSystem;

  beforeEach(() => {
    mockConsoleLog = jest.spyOn(global.console, 'log').mockReturnValue(undefined);
    jest.spyOn<any, any>(global, 'Date').mockImplementation(() => timestamp);
    loggingSystem = new BrowserLoggingSystem({ logLevel: 'warn' });
  });

  afterEach(() => {
    mockConsoleLog.mockReset();
  });

  describe('#get', () => {
    it('returns the same logger for same context', () => {
      const loggerA = loggingSystem.get('same.logger');
      const loggerB = loggingSystem.get('same.logger');
      expect(loggerA).toBe(loggerB);
    });

    it('returns different loggers for different contexts', () => {
      const loggerA = loggingSystem.get('some.logger');
      const loggerB = loggingSystem.get('another.logger');
      expect(loggerA).not.toBe(loggerB);
    });
  });

  describe('logger configuration', () => {
    it('properly configure the logger to use the correct context and pattern', () => {
      const logger = loggingSystem.get('foo.bar');
      logger.warn('some message');

      expect(mockConsoleLog.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          "[2012-02-01T09:33:22.011-05:00][WARN ][foo.bar] some message",
        ]
      `);
    });

    it('properly configure the logger to use the correct level', () => {
      const logger = loggingSystem.get('foo.bar');
      logger.trace('some trace message');
      logger.debug('some debug message');
      logger.info('some info message');
      logger.warn('some warn message');
      logger.error('some error message');
      logger.fatal('some fatal message');

      expect(mockConsoleLog.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "[2012-02-01T04:33:22.011-05:00][WARN ][foo.bar] some warn message",
          ],
          Array [
            "[2012-01-31T23:33:22.011-05:00][ERROR][foo.bar] some error message",
          ],
          Array [
            "[2012-01-31T18:33:22.011-05:00][FATAL][foo.bar] some fatal message",
          ],
        ]
      `);
    });
  });
});
