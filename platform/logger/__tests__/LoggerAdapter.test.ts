import { LoggerAdapter } from '../LoggerAdapter';
import { Level } from '../Level';

test('calls the provided logger', () => {
  const logger = {
    log: jest.fn(),
    update: jest.fn(),
    close: jest.fn()
  };

  const loggerAdapter = new LoggerAdapter(
    ['name', 'space'],
    logger,
    Level.Info
  );

  loggerAdapter.info('message', { key: 'value' });

  expect(logger.log).toHaveBeenCalledTimes(1);

  const callToLog = logger.log.mock.calls[0][0];

  expect(callToLog).toHaveProperty('timestamp');

  expect(callToLog).toMatchObject({
    context: ['name', 'space'],
    level: {
      id: 'info'
    },
    message: 'message',
    meta: { key: 'value' }
  });
});

test('calls the updated logger', () => {
  const logger = {
    log: jest.fn(),
    update: jest.fn(),
    close: jest.fn()
  };

  const loggerAdapter = new LoggerAdapter(
    ['name', 'space'],
    logger,
    Level.Info
  );

  const newLogger = {
    log: jest.fn(),
    update: jest.fn(),
    close: jest.fn()
  }

  loggerAdapter.update(newLogger, Level.Info);

  loggerAdapter.info('message', { key: 'value' });

  expect(logger.log).toHaveBeenCalledTimes(0);
  expect(newLogger.log).toHaveBeenCalledTimes(1);
});

test('does not call logger if log level is not high enough', () => {
  const logger = {
    log: jest.fn(),
    update: jest.fn(),
    close: jest.fn()
  };

  const loggerAdapter = new LoggerAdapter(
    ['name', 'space'],
    logger,
    Level.Info
  );

  loggerAdapter.debug('message', { key: 'value' });

  expect(logger.log).toHaveBeenCalledTimes(0);
});

test('throws if logger or level is not specified', () => {
  const loggerAdapter = new LoggerAdapter(['foo']);

  expect(() => {
    loggerAdapter.debug('message', { key: 'value' });
  }).toThrowErrorMatchingSnapshot();
});

test('can log errors', () => {
  const logger = {
    log: jest.fn(),
    update: jest.fn(),
    close: jest.fn()
  };

  const loggerAdapter = new LoggerAdapter(
    ['name', 'space'],
    logger,
    Level.Info
  );

  const error = new Error('my error message');
  loggerAdapter.error(error);

  expect(logger.log).toHaveBeenCalledTimes(1);

  const callToLog = logger.log.mock.calls[0][0];

  expect(callToLog).toMatchObject({
    context: ['name', 'space'],
    level: {
      id: 'error'
    },
    error,
    message: 'my error message',
    meta: undefined
  });
});
