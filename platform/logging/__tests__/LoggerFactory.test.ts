import * as mockSchema from '../../lib/schema';
import { LoggingConfig } from '../LoggingConfig';

const tickMs = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const mockStreamWrite = jest.fn();
const mockStreamEndFinished = jest.fn();
const mockStreamEnd = jest.fn(async (chunk, encoding, callback) => {
  // It's required to make sure `dispose` waits for `end` to complete.
  await tickMs(100);
  mockStreamEndFinished();
  callback();
});
jest.mock('fs', () => ({
  createWriteStream: () => ({ write: mockStreamWrite, end: mockStreamEnd })
}));

const timestamp = new Date(Date.UTC(2012, 1, 1));
const mockConsoleLog = jest
  .spyOn(global.console, 'log')
  .mockImplementation(() => {});
jest.spyOn(global, 'Date').mockImplementation(() => timestamp);

import { MutableLoggerFactory } from '../LoggerFactory';

beforeEach(() => {
  mockStreamWrite.mockClear();
  mockStreamEnd.mockClear();
  mockStreamEndFinished.mockClear();
  mockConsoleLog.mockClear();
});

test('`get()` returns Logger that appends records to buffer if config is not ready.', () => {
  const factory = new MutableLoggerFactory({} as any);
  const loggerWithoutConfig = factory.get('some-context');
  const testsLogger = factory.get('tests');
  const testsChildLogger = factory.get('tests', 'child');

  loggerWithoutConfig.info('You know, just for your info.');
  testsLogger.warn('Config is not ready!');
  testsChildLogger.error('Too bad that config is not ready :/');
  testsChildLogger.info('Just some info that should not be logged.');

  expect(mockConsoleLog).not.toHaveBeenCalled();
  expect(mockStreamWrite).not.toHaveBeenCalled();

  const loggingConfigSchema = LoggingConfig.createSchema(mockSchema);
  const config = new LoggingConfig(
    loggingConfigSchema.validate({
      appenders: {
        default: {
          kind: 'console',
          layout: { kind: 'pattern' }
        },
        file: {
          kind: 'file',
          path: 'path',
          layout: { kind: 'pattern' }
        }
      },
      loggers: [
        {
          context: 'tests',
          appenders: ['file'],
          level: 'warn'
        },
        {
          context: 'tests.child',
          level: 'error'
        }
      ]
    })
  );

  factory.updateConfig(config);

  // Now all logs should added to configured appenders.
  expect(mockConsoleLog).toHaveBeenCalledTimes(1);
  expect(mockConsoleLog).toHaveBeenCalledWith(
    '[2012-02-01T00:00:00.000Z][INFO ][some-context] You know, just for your info.'
  );

  expect(mockStreamWrite).toHaveBeenCalledTimes(2);
  expect(mockStreamWrite).toHaveBeenCalledWith(
    '[2012-02-01T00:00:00.000Z][WARN ][tests] Config is not ready!\n'
  );
  expect(mockStreamWrite).toHaveBeenCalledWith(
    '[2012-02-01T00:00:00.000Z][ERROR][tests.child] Too bad that config is not ready :/\n'
  );
});

test('`get()` returns `root` logger if context is not specified.', () => {
  const loggingConfigSchema = LoggingConfig.createSchema(mockSchema);
  const factory = new MutableLoggerFactory({} as any);
  const config = loggingConfigSchema.validate({
    appenders: {
      default: {
        kind: 'console',
        layout: { kind: 'pattern' }
      }
    }
  });
  factory.updateConfig(new LoggingConfig(config));

  const rootLogger = factory.get();

  rootLogger.info('This message goes to a root context.');

  expect(mockConsoleLog).toHaveBeenCalledTimes(1);
  expect(mockConsoleLog).toHaveBeenCalledWith(
    '[2012-02-01T00:00:00.000Z][INFO ][root] This message goes to a root context.'
  );
});

test('`close()` disposes all resources used by appenders.', async () => {
  const factory = new MutableLoggerFactory({} as any);

  const loggingConfigSchema = LoggingConfig.createSchema(mockSchema);
  const config = new LoggingConfig(
    loggingConfigSchema.validate({
      appenders: {
        default: {
          kind: 'file',
          path: 'path',
          layout: { kind: 'pattern' }
        }
      }
    })
  );

  factory.updateConfig(config);

  const logger = factory.get('some-context');
  logger.info('You know, just for your info.');

  expect(mockStreamWrite).toHaveBeenCalled();
  expect(mockStreamEnd).not.toHaveBeenCalled();

  await factory.close();

  expect(mockStreamEnd).toHaveBeenCalledTimes(1);
  expect(mockStreamEnd).toHaveBeenCalledWith(
    undefined,
    undefined,
    expect.any(Function)
  );
  expect(mockStreamEndFinished).toHaveBeenCalled();
});
