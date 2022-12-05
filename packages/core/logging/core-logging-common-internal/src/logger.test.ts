/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Appender, LogLevel, LogMeta, LogRecord } from '@kbn/logging';
import { getLoggerContext } from '..';
import { AbstractLogger, CreateLogRecordFn } from './logger';

describe('AbstractLogger', () => {
  const context = getLoggerContext(['context', 'parent', 'child']);
  const factory = {
    get: jest.fn().mockImplementation(() => logger),
  };

  let appenderMocks: Appender[];

  const createLogRecordSpy: jest.MockedFunction<CreateLogRecordFn> = jest.fn();

  class TestLogger extends AbstractLogger {
    createLogRecord<Meta extends LogMeta>(
      level: LogLevel,
      errorOrMessage: string | Error,
      meta?: Meta
    ) {
      return createLogRecordSpy(level, errorOrMessage, meta);
    }
  }

  let logger: TestLogger;

  beforeEach(() => {
    appenderMocks = [{ append: jest.fn() }, { append: jest.fn() }];
    logger = new TestLogger(context, LogLevel.All, appenderMocks, factory);

    createLogRecordSpy.mockImplementation((level, message, meta) => {
      return {
        level,
        message,
        meta,
      } as LogRecord;
    });
  });

  afterEach(() => {
    createLogRecordSpy.mockReset();
  });

  describe('#trace', () => {
    it('calls `createLogRecord` with the correct parameters', () => {
      const meta = { tags: ['foo', 'bar'] };
      logger.trace('some message', meta);

      expect(createLogRecordSpy).toHaveBeenCalledTimes(1);
      expect(createLogRecordSpy).toHaveBeenCalledWith(LogLevel.Trace, 'some message', meta);
    });

    it('pass the log record down to all appenders', () => {
      const logRecord = { message: 'dummy', level: LogLevel.Trace } as LogRecord;
      createLogRecordSpy.mockReturnValue(logRecord);
      logger.trace('some message');
      for (const appenderMock of appenderMocks) {
        expect(appenderMock.append).toHaveBeenCalledTimes(1);
        expect(appenderMock.append).toHaveBeenCalledWith(logRecord);
      }
    });
  });

  describe('#debug', () => {
    it('calls `createLogRecord` with the correct parameters', () => {
      const meta = { tags: ['foo', 'bar'] };
      logger.debug('some message', meta);

      expect(createLogRecordSpy).toHaveBeenCalledTimes(1);
      expect(createLogRecordSpy).toHaveBeenCalledWith(LogLevel.Debug, 'some message', meta);
    });

    it('pass the log record down to all appenders', () => {
      const logRecord = { message: 'dummy', level: LogLevel.Debug } as LogRecord;
      createLogRecordSpy.mockReturnValue(logRecord);
      logger.debug('some message');
      for (const appenderMock of appenderMocks) {
        expect(appenderMock.append).toHaveBeenCalledTimes(1);
        expect(appenderMock.append).toHaveBeenCalledWith(logRecord);
      }
    });
  });

  describe('#info', () => {
    it('calls `createLogRecord` with the correct parameters', () => {
      const meta = { tags: ['foo', 'bar'] };
      logger.info('some message', meta);

      expect(createLogRecordSpy).toHaveBeenCalledTimes(1);
      expect(createLogRecordSpy).toHaveBeenCalledWith(LogLevel.Info, 'some message', meta);
    });

    it('pass the log record down to all appenders', () => {
      const logRecord = { message: 'dummy', level: LogLevel.Info } as LogRecord;
      createLogRecordSpy.mockReturnValue(logRecord);
      logger.info('some message');
      for (const appenderMock of appenderMocks) {
        expect(appenderMock.append).toHaveBeenCalledTimes(1);
        expect(appenderMock.append).toHaveBeenCalledWith(logRecord);
      }
    });
  });

  describe('#warn', () => {
    it('calls `createLogRecord` with the correct parameters', () => {
      const meta = { tags: ['foo', 'bar'] };
      logger.warn('some message', meta);

      expect(createLogRecordSpy).toHaveBeenCalledTimes(1);
      expect(createLogRecordSpy).toHaveBeenCalledWith(LogLevel.Warn, 'some message', meta);
    });

    it('pass the log record down to all appenders', () => {
      const logRecord = { message: 'dummy', level: LogLevel.Warn } as LogRecord;
      createLogRecordSpy.mockReturnValue(logRecord);
      logger.warn('some message');
      for (const appenderMock of appenderMocks) {
        expect(appenderMock.append).toHaveBeenCalledTimes(1);
        expect(appenderMock.append).toHaveBeenCalledWith(logRecord);
      }
    });
  });

  describe('#error', () => {
    it('calls `createLogRecord` with the correct parameters', () => {
      const meta = { tags: ['foo', 'bar'] };
      logger.error('some message', meta);

      expect(createLogRecordSpy).toHaveBeenCalledTimes(1);
      expect(createLogRecordSpy).toHaveBeenCalledWith(LogLevel.Error, 'some message', meta);
    });

    it('pass the log record down to all appenders', () => {
      const logRecord = { message: 'dummy', level: LogLevel.Error } as LogRecord;
      createLogRecordSpy.mockReturnValue(logRecord);
      logger.error('some message');
      for (const appenderMock of appenderMocks) {
        expect(appenderMock.append).toHaveBeenCalledTimes(1);
        expect(appenderMock.append).toHaveBeenCalledWith(logRecord);
      }
    });
  });

  describe('#fatal', () => {
    it('calls `createLogRecord` with the correct parameters', () => {
      const meta = { tags: ['foo', 'bar'] };
      logger.fatal('some message', meta);

      expect(createLogRecordSpy).toHaveBeenCalledTimes(1);
      expect(createLogRecordSpy).toHaveBeenCalledWith(LogLevel.Fatal, 'some message', meta);
    });

    it('pass the log record down to all appenders', () => {
      const logRecord = { message: 'dummy', level: LogLevel.Fatal } as LogRecord;
      createLogRecordSpy.mockReturnValue(logRecord);
      logger.fatal('some message');
      for (const appenderMock of appenderMocks) {
        expect(appenderMock.append).toHaveBeenCalledTimes(1);
        expect(appenderMock.append).toHaveBeenCalledWith(logRecord);
      }
    });
  });

  describe('#get', () => {
    it('calls the logger factory with proper context and return the result', () => {
      logger.get('sub', 'context');
      expect(factory.get).toHaveBeenCalledTimes(1);
      expect(factory.get).toHaveBeenCalledWith(context, 'sub', 'context');

      factory.get.mockClear();
      factory.get.mockImplementation(() => 'some-logger');

      const childLogger = logger.get('other', 'sub');
      expect(factory.get).toHaveBeenCalledTimes(1);
      expect(factory.get).toHaveBeenCalledWith(context, 'other', 'sub');
      expect(childLogger).toEqual('some-logger');
    });
  });

  describe('log level', () => {
    it('does not calls appenders for records with unsupported levels', () => {
      logger = new TestLogger(context, LogLevel.Warn, appenderMocks, factory);

      logger.trace('some trace message');
      logger.debug('some debug message');
      logger.info('some info message');
      logger.warn('some warn message');
      logger.error('some error message');
      logger.fatal('some fatal message');

      for (const appenderMock of appenderMocks) {
        expect(appenderMock.append).toHaveBeenCalledTimes(3);
        expect(appenderMock.append).toHaveBeenCalledWith(
          expect.objectContaining({
            level: LogLevel.Warn,
          })
        );
        expect(appenderMock.append).toHaveBeenCalledWith(
          expect.objectContaining({
            level: LogLevel.Error,
          })
        );
        expect(appenderMock.append).toHaveBeenCalledWith(
          expect.objectContaining({
            level: LogLevel.Fatal,
          })
        );
      }
    });
  });

  describe('isLevelEnabled', () => {
    const orderedLogLevels = [
      LogLevel.Fatal,
      LogLevel.Error,
      LogLevel.Warn,
      LogLevel.Info,
      LogLevel.Debug,
      LogLevel.Trace,
      LogLevel.All,
    ];

    for (const logLevel of orderedLogLevels) {
      it(`returns the correct value for a '${logLevel.id}' level logger`, () => {
        const levelLogger = new TestLogger(context, logLevel, appenderMocks, factory);
        for (const level of orderedLogLevels) {
          const levelEnabled = logLevel.supports(level);
          expect(levelLogger.isLevelEnabled(level.id)).toEqual(levelEnabled);
        }
      });
    }
  });
});
