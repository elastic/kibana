import { Logger } from '../Logger';
import { LoggerAdapter } from '../LoggerAdapter';

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

  test('throws if trying to use internal logger', () => {
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

    expect(() => {
      adapter.logger.debug('foo');
    }).toThrowErrorMatchingSnapshot();
  });
});
