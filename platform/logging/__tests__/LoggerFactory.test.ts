import { Observable } from 'rxjs';

const mockStreamWrite = jest.fn();
const mockStreamEndFinished = jest.fn();
const mockStreamEnd = jest.fn(async (chunk, encoding, callback) => {
  // It's required to make sure `dispose` waits for `end` to complete.
  await Observable.from([]).delay(100).toPromise();
  mockStreamEndFinished();
  callback();
});
jest.mock('fs', () => ({
  createWriteStream: () => ({ write: mockStreamWrite, end: mockStreamEnd })
}));

import * as mockSchema from '../../lib/schema';
import { LoggingConfig } from '../LoggingConfig';
import { MutableLoggerFactory } from '../LoggerFactory';

const timestamp = new Date(2012, 1, 1);
beforeEach(() => {
  jest.spyOn(global.console, 'log').mockImplementation(() => {});
  jest.spyOn(global, 'Date').mockImplementation(() => timestamp);
});

test('`get()` returns Logger that appends records to buffer if config is not ready.', async () => {
  const factory = new MutableLoggerFactory();
  const loggerWithoutConfig = factory.get('some-context');
  const testsLogger = factory.get('tests');
  const testsChildLogger = factory.get('tests::child');

  loggerWithoutConfig.info('You know, just for your info.');
  testsLogger.warn('Config is not ready!');
  testsChildLogger.error('Too bad that config is not ready :/');
  testsChildLogger.info('Just some info that should not be logged.');

  expect(global.console.log).not.toHaveBeenCalled();
  expect(mockStreamWrite).not.toHaveBeenCalled();

  const loggingConfigSchema = LoggingConfig.createSchema(mockSchema);
  const config = new LoggingConfig(
    loggingConfigSchema.validate({
      appenders: {
        console: {
          kind: 'console',
          layout: { kind: 'pattern' }
        },
        file: {
          kind: 'file',
          path: 'path',
          layout: { kind: 'pattern' }
        }
      },
      loggers: {
        root: { appenders: ['console'] },
        tests: {
          appenders: ['file'],
          level: 'warn'
        },
        'tests::child': {
          level: 'error'
        }
      }
    })
  );

  await factory.updateConfig(config);

  // Now all logs should added to configured appenders.
  expect(global.console.log).toHaveBeenCalledTimes(1);
  expect(global.console.log).toHaveBeenCalledWith(
    '[2012-01-31T23:00:00.000Z][INFO ][some-context] You know, just for your info.'
  );

  expect(mockStreamWrite).toHaveBeenCalledTimes(2);
  expect(mockStreamWrite).toHaveBeenCalledWith(
    '[2012-01-31T23:00:00.000Z][WARN ][tests] Config is not ready!\n'
  );
  expect(mockStreamWrite).toHaveBeenCalledWith(
    '[2012-01-31T23:00:00.000Z][ERROR][tests::child] Too bad that config is not ready :/\n'
  );
});

test('`close()` disposes all resources used by appenders.', async () => {
  const factory = new MutableLoggerFactory();

  const loggingConfigSchema = LoggingConfig.createSchema(mockSchema);
  const config = new LoggingConfig(
    loggingConfigSchema.validate({
      appenders: {
        file: {
          kind: 'file',
          path: 'path',
          layout: { kind: 'pattern' }
        }
      },
      loggers: {
        root: { appenders: ['file'] }
      }
    })
  );

  await factory.updateConfig(config);

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
