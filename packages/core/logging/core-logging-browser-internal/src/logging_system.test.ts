/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { LogLevelId, Logger } from '@kbn/logging';
import { unsafeConsole } from '@kbn/security-hardening';
import type { BrowserLoggingConfig } from '@kbn/core-logging-common-internal';
import { BrowserLoggingSystem } from './logging_system';
import type { BaseLogger } from './logger';

describe('BrowserLoggingSystem', () => {
  const timestamp = new Date(Date.UTC(2012, 1, 1, 14, 33, 22, 11));

  let mockConsoleLog: jest.SpyInstance;

  const createLoggingConfig = (parts: Partial<BrowserLoggingConfig> = {}): BrowserLoggingConfig => {
    return {
      root: {
        level: 'warn',
      },
      loggers: [],
      ...parts,
    };
  };

  beforeEach(() => {
    mockConsoleLog = jest.spyOn(unsafeConsole, 'log').mockReturnValue(undefined);
    jest.spyOn<any, any>(global, 'Date').mockImplementation(() => timestamp);
  });

  afterEach(() => {
    mockConsoleLog.mockReset();
  });

  describe('#get', () => {
    it('returns the same logger for same context', () => {
      const loggingSystem = new BrowserLoggingSystem(createLoggingConfig());
      const loggerA = loggingSystem.get('same.logger');
      const loggerB = loggingSystem.get('same.logger');
      expect(loggerA).toBe(loggerB);
    });

    it('returns different loggers for different contexts', () => {
      const loggingSystem = new BrowserLoggingSystem(createLoggingConfig());
      const loggerA = loggingSystem.get('some.logger');
      const loggerB = loggingSystem.get('another.logger');
      expect(loggerA).not.toBe(loggerB);
    });
  });

  describe('root logger configuration', () => {
    it('properly configure the logger to use the correct context and pattern', () => {
      const loggingSystem = new BrowserLoggingSystem(createLoggingConfig());
      const logger = loggingSystem.get('foo.bar');
      logger.warn('some message');

      expect(mockConsoleLog.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          "[2012-02-01T09:33:22.011-05:00][WARN ][foo.bar] some message",
        ]
      `);
    });

    it('properly configure the logger to use the correct level', () => {
      const loggingSystem = new BrowserLoggingSystem(createLoggingConfig());
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

    it('allows to override the root logger level', () => {
      const loggingSystem = new BrowserLoggingSystem(
        createLoggingConfig({ root: { level: 'debug' } })
      );

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
            "[2012-01-31T13:33:22.011-05:00][DEBUG][foo.bar] some debug message",
          ],
          Array [
            "[2012-01-31T08:33:22.011-05:00][INFO ][foo.bar] some info message",
          ],
          Array [
            "[2012-01-31T03:33:22.011-05:00][WARN ][foo.bar] some warn message",
          ],
          Array [
            "[2012-01-30T22:33:22.011-05:00][ERROR][foo.bar] some error message",
          ],
          Array [
            "[2012-01-30T17:33:22.011-05:00][FATAL][foo.bar] some fatal message",
          ],
        ]
      `);
    });
  });

  describe('loggers configuration', () => {
    it('uses the logger config if specified', () => {
      const loggingSystem = new BrowserLoggingSystem(
        createLoggingConfig({
          root: { level: 'debug' },
          loggers: [{ name: 'foo.bar', level: 'warn' }],
        })
      );

      const logger = loggingSystem.get('foo.bar') as BaseLogger;

      expect(getLoggerLevel(logger)).toBe('warn');
    });

    it('uses the parent config if present and logger config is not', () => {
      const loggingSystem = new BrowserLoggingSystem(
        createLoggingConfig({
          root: { level: 'debug' },
          loggers: [{ name: 'foo', level: 'warn' }],
        })
      );

      const logger = loggingSystem.get('foo.bar') as BaseLogger;

      expect(getLoggerLevel(logger)).toBe('warn');
    });

    it('uses the closest parent config', () => {
      const loggingSystem = new BrowserLoggingSystem(
        createLoggingConfig({
          root: { level: 'debug' },
          loggers: [
            { name: 'foo', level: 'warn' },
            { name: 'foo.bar', level: 'error' },
          ],
        })
      );

      const logger = loggingSystem.get('foo.bar.hello') as BaseLogger;

      expect(getLoggerLevel(logger)).toBe('error');
    });

    it('uses the root logger config by default', () => {
      const loggingSystem = new BrowserLoggingSystem(
        createLoggingConfig({
          root: { level: 'debug' },
          loggers: [],
        })
      );

      const logger = loggingSystem.get('foo.bar.hello') as BaseLogger;

      expect(getLoggerLevel(logger)).toBe('debug');
    });
  });
});

const getLoggerLevel = (logger: Logger): LogLevelId => {
  const levels: LogLevelId[] = ['all', 'trace', 'debug', 'info', 'warn', 'error', 'fatal', 'all'];
  for (const level of levels) {
    if (logger.isLevelEnabled(level)) {
      return level;
    }
  }
  return 'off';
};
