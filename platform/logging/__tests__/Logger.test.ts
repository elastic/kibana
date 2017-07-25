import { Appender } from '../appenders/Appenders';
import { LoggingConfig } from '../LoggingConfig';
import { LogLevel } from '../LogLevel';
import { Logger, BaseLogger, LoggerAdapter } from '../Logger';

describe('BaseAppender methods', () => {
  const context = LoggingConfig.getLoggerContext([
    'context',
    'parent',
    'child'
  ]);
  let appenderMocks: Appender[];
  let logger: BaseLogger;

  const timestamp = new Date(2012, 1, 1);
  jest.spyOn(global, 'Date').mockImplementation(() => timestamp);

  beforeEach(() => {
    appenderMocks = [{ append: jest.fn() }, { append: jest.fn() }];
    logger = new BaseLogger(context, LogLevel.All, appenderMocks);
  });

  test('`trace()` correctly forms `LogRecord` and passes it to all appenders.', () => {
    logger.trace('message-1');
    for (const appenderMock of appenderMocks) {
      expect(appenderMock.append).toHaveBeenCalledTimes(1);
      expect(appenderMock.append).toHaveBeenCalledWith({
        context,
        timestamp,
        level: LogLevel.Trace,
        message: 'message-1',
        error: undefined,
        meta: undefined
      });
    }

    logger.trace('message-2', { trace: true });
    for (const appenderMock of appenderMocks) {
      expect(appenderMock.append).toHaveBeenCalledTimes(2);
      expect(appenderMock.append).toHaveBeenCalledWith({
        context,
        timestamp,
        level: LogLevel.Trace,
        message: 'message-2',
        error: undefined,
        meta: { trace: true }
      });
    }
  });

  test('`debug()` correctly forms `LogRecord` and passes it to all appenders.', () => {
    logger.debug('message-1');
    for (const appenderMock of appenderMocks) {
      expect(appenderMock.append).toHaveBeenCalledTimes(1);
      expect(appenderMock.append).toHaveBeenCalledWith({
        context,
        timestamp,
        level: LogLevel.Debug,
        message: 'message-1',
        error: undefined,
        meta: undefined
      });
    }

    logger.debug('message-2', { debug: true });
    for (const appenderMock of appenderMocks) {
      expect(appenderMock.append).toHaveBeenCalledTimes(2);
      expect(appenderMock.append).toHaveBeenCalledWith({
        context,
        timestamp,
        level: LogLevel.Debug,
        message: 'message-2',
        error: undefined,
        meta: { debug: true }
      });
    }
  });

  test('`info()` correctly forms `LogRecord` and passes it to all appenders.', () => {
    logger.info('message-1');
    for (const appenderMock of appenderMocks) {
      expect(appenderMock.append).toHaveBeenCalledTimes(1);
      expect(appenderMock.append).toHaveBeenCalledWith({
        context,
        timestamp,
        level: LogLevel.Info,
        message: 'message-1',
        error: undefined,
        meta: undefined
      });
    }

    logger.info('message-2', { info: true });
    for (const appenderMock of appenderMocks) {
      expect(appenderMock.append).toHaveBeenCalledTimes(2);
      expect(appenderMock.append).toHaveBeenCalledWith({
        context,
        timestamp,
        level: LogLevel.Info,
        message: 'message-2',
        error: undefined,
        meta: { info: true }
      });
    }
  });

  test('`warn()` correctly forms `LogRecord` and passes it to all appenders.', () => {
    logger.warn('message-1');
    for (const appenderMock of appenderMocks) {
      expect(appenderMock.append).toHaveBeenCalledTimes(1);
      expect(appenderMock.append).toHaveBeenCalledWith({
        context,
        timestamp,
        level: LogLevel.Warn,
        message: 'message-1',
        error: undefined,
        meta: undefined
      });
    }

    const error = new Error('message-2');
    logger.warn(error);
    for (const appenderMock of appenderMocks) {
      expect(appenderMock.append).toHaveBeenCalledTimes(2);
      expect(appenderMock.append).toHaveBeenCalledWith({
        context,
        timestamp,
        level: LogLevel.Warn,
        message: 'message-2',
        error: error,
        meta: undefined
      });
    }

    logger.warn('message-3', { warn: true });
    for (const appenderMock of appenderMocks) {
      expect(appenderMock.append).toHaveBeenCalledTimes(3);
      expect(appenderMock.append).toHaveBeenCalledWith({
        context,
        timestamp,
        level: LogLevel.Warn,
        message: 'message-3',
        error: undefined,
        meta: { warn: true }
      });
    }
  });

  test('`error()` correctly forms `LogRecord` and passes it to all appenders.', () => {
    logger.error('message-1');
    for (const appenderMock of appenderMocks) {
      expect(appenderMock.append).toHaveBeenCalledTimes(1);
      expect(appenderMock.append).toHaveBeenCalledWith({
        context,
        timestamp,
        level: LogLevel.Error,
        message: 'message-1',
        error: undefined,
        meta: undefined
      });
    }

    const error = new Error('message-2');
    logger.error(error);
    for (const appenderMock of appenderMocks) {
      expect(appenderMock.append).toHaveBeenCalledTimes(2);
      expect(appenderMock.append).toHaveBeenCalledWith({
        context,
        timestamp,
        level: LogLevel.Error,
        message: 'message-2',
        error: error,
        meta: undefined
      });
    }

    logger.error('message-3', { error: true });
    for (const appenderMock of appenderMocks) {
      expect(appenderMock.append).toHaveBeenCalledTimes(3);
      expect(appenderMock.append).toHaveBeenCalledWith({
        context,
        timestamp,
        level: LogLevel.Error,
        message: 'message-3',
        error: undefined,
        meta: { error: true }
      });
    }
  });

  test('`fatal()` correctly forms `LogRecord` and passes it to all appenders.', () => {
    logger.fatal('message-1');
    for (const appenderMock of appenderMocks) {
      expect(appenderMock.append).toHaveBeenCalledTimes(1);
      expect(appenderMock.append).toHaveBeenCalledWith({
        context,
        timestamp,
        level: LogLevel.Fatal,
        message: 'message-1',
        error: undefined,
        meta: undefined
      });
    }

    const error = new Error('message-2');
    logger.fatal(error);
    for (const appenderMock of appenderMocks) {
      expect(appenderMock.append).toHaveBeenCalledTimes(2);
      expect(appenderMock.append).toHaveBeenCalledWith({
        context,
        timestamp,
        level: LogLevel.Fatal,
        message: 'message-2',
        error: error,
        meta: undefined
      });
    }

    logger.fatal('message-3', { fatal: true });
    for (const appenderMock of appenderMocks) {
      expect(appenderMock.append).toHaveBeenCalledTimes(3);
      expect(appenderMock.append).toHaveBeenCalledWith({
        context,
        timestamp,
        level: LogLevel.Fatal,
        message: 'message-3',
        error: undefined,
        meta: { fatal: true }
      });
    }
  });

  test('`log()` just passes the record to all appenders.', () => {
    const record = {
      context,
      timestamp,
      level: LogLevel.Info,
      message: 'message-1'
    };

    logger.log(record);

    for (const appenderMock of appenderMocks) {
      expect(appenderMock.append).toHaveBeenCalledTimes(1);
      expect(appenderMock.append).toHaveBeenCalledWith(record);
    }
  });

  test('logger with `Off` level does not pass any records to appenders.', () => {
    const turnedOffLogger = new BaseLogger(
      context,
      LogLevel.Off,
      appenderMocks
    );
    turnedOffLogger.trace('trace-message');
    turnedOffLogger.debug('debug-message');
    turnedOffLogger.info('info-message');
    turnedOffLogger.warn('warn-message');
    turnedOffLogger.error('error-message');
    turnedOffLogger.fatal('fatal-message');

    for (const appenderMock of appenderMocks) {
      expect(appenderMock.append).not.toHaveBeenCalled();
    }
  });

  test('logger with `All` level passes all records to appenders.', () => {
    const catchAllLogger = new BaseLogger(context, LogLevel.All, appenderMocks);

    catchAllLogger.trace('trace-message');
    for (const appenderMock of appenderMocks) {
      expect(appenderMock.append).toHaveBeenCalledTimes(1);
      expect(appenderMock.append).toHaveBeenCalledWith({
        context,
        timestamp,
        level: LogLevel.Trace,
        message: 'trace-message'
      });
    }

    catchAllLogger.debug('debug-message');
    for (const appenderMock of appenderMocks) {
      expect(appenderMock.append).toHaveBeenCalledTimes(2);
      expect(appenderMock.append).toHaveBeenCalledWith({
        context,
        timestamp,
        level: LogLevel.Debug,
        message: 'debug-message'
      });
    }

    catchAllLogger.info('info-message');
    for (const appenderMock of appenderMocks) {
      expect(appenderMock.append).toHaveBeenCalledTimes(3);
      expect(appenderMock.append).toHaveBeenCalledWith({
        context,
        timestamp,
        level: LogLevel.Info,
        message: 'info-message'
      });
    }

    catchAllLogger.warn('warn-message');
    for (const appenderMock of appenderMocks) {
      expect(appenderMock.append).toHaveBeenCalledTimes(4);
      expect(appenderMock.append).toHaveBeenCalledWith({
        context,
        timestamp,
        level: LogLevel.Warn,
        message: 'warn-message'
      });
    }

    catchAllLogger.error('error-message');
    for (const appenderMock of appenderMocks) {
      expect(appenderMock.append).toHaveBeenCalledTimes(5);
      expect(appenderMock.append).toHaveBeenCalledWith({
        context,
        timestamp,
        level: LogLevel.Error,
        message: 'error-message'
      });
    }

    catchAllLogger.fatal('fatal-message');
    for (const appenderMock of appenderMocks) {
      expect(appenderMock.append).toHaveBeenCalledTimes(6);
      expect(appenderMock.append).toHaveBeenCalledWith({
        context,
        timestamp,
        level: LogLevel.Fatal,
        message: 'fatal-message'
      });
    }
  });

  test('passes log record to appenders only if log level is supported.', () => {
    const warnLogger = new BaseLogger(context, LogLevel.Warn, appenderMocks);

    warnLogger.trace('trace-message');
    warnLogger.debug('debug-message');
    warnLogger.info('info-message');

    for (const appenderMock of appenderMocks) {
      expect(appenderMock.append).not.toHaveBeenCalled();
    }

    warnLogger.warn('warn-message');
    for (const appenderMock of appenderMocks) {
      expect(appenderMock.append).toHaveBeenCalledTimes(1);
      expect(appenderMock.append).toHaveBeenCalledWith({
        context,
        timestamp,
        level: LogLevel.Warn,
        message: 'warn-message'
      });
    }

    warnLogger.error('error-message');
    for (const appenderMock of appenderMocks) {
      expect(appenderMock.append).toHaveBeenCalledTimes(2);
      expect(appenderMock.append).toHaveBeenCalledWith({
        context,
        timestamp,
        level: LogLevel.Error,
        message: 'error-message'
      });
    }

    warnLogger.fatal('fatal-message');
    for (const appenderMock of appenderMocks) {
      expect(appenderMock.append).toHaveBeenCalledTimes(3);
      expect(appenderMock.append).toHaveBeenCalledWith({
        context,
        timestamp,
        level: LogLevel.Fatal,
        message: 'fatal-message'
      });
    }
  });
});

describe('LoggerAdapter methods', () => {
  test('proxies all method calls to the internal logger.', () => {
    const internalLogger: Logger = {
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
      log: jest.fn()
    };

    const adapter = new LoggerAdapter(internalLogger);

    adapter.trace('trace-message');
    expect(internalLogger.trace).toHaveBeenCalledTimes(1);
    expect(internalLogger.trace).toHaveBeenCalledWith(
      'trace-message',
      undefined
    );

    adapter.debug('debug-message');
    expect(internalLogger.debug).toHaveBeenCalledTimes(1);
    expect(internalLogger.debug).toHaveBeenCalledWith(
      'debug-message',
      undefined
    );

    adapter.info('info-message');
    expect(internalLogger.info).toHaveBeenCalledTimes(1);
    expect(internalLogger.info).toHaveBeenCalledWith('info-message', undefined);

    adapter.warn('warn-message');
    expect(internalLogger.warn).toHaveBeenCalledTimes(1);
    expect(internalLogger.warn).toHaveBeenCalledWith('warn-message', undefined);

    adapter.error('error-message');
    expect(internalLogger.error).toHaveBeenCalledTimes(1);
    expect(internalLogger.error).toHaveBeenCalledWith(
      'error-message',
      undefined
    );

    adapter.fatal('fatal-message');
    expect(internalLogger.fatal).toHaveBeenCalledTimes(1);
    expect(internalLogger.fatal).toHaveBeenCalledWith(
      'fatal-message',
      undefined
    );
  });

  test('forwards all method calls to new internal logger if it is updated.', () => {
    const oldInternalLogger: Logger = {
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
      log: jest.fn()
    };

    const newInternalLogger: Logger = {
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
      log: jest.fn()
    };

    const adapter = new LoggerAdapter(oldInternalLogger);

    adapter.trace('trace-message');
    expect(oldInternalLogger.trace).toHaveBeenCalledTimes(1);
    expect(oldInternalLogger.trace).toHaveBeenCalledWith(
      'trace-message',
      undefined
    );
    (oldInternalLogger.trace as jest.Mock<Function>).mockReset();

    adapter.logger = newInternalLogger;
    adapter.trace('trace-message');
    expect(oldInternalLogger.trace).not.toHaveBeenCalled();
    expect(newInternalLogger.trace).toHaveBeenCalledTimes(1);
    expect(newInternalLogger.trace).toHaveBeenCalledWith(
      'trace-message',
      undefined
    );
  });
});
