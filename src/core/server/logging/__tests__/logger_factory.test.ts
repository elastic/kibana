/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

const mockCreateWriteStream: any = {};

jest.mock('fs', () => ({
  createWriteStream: () => mockCreateWriteStream,
}));

import { MutableLoggerFactory } from '../logger_factory';
import { LoggingConfig } from '../logging_config';

const tickMs = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const mockStreamEndFinished = jest.fn();
mockCreateWriteStream.write = jest.fn();
mockCreateWriteStream.end = jest.fn(async (chunk, encoding, callback) => {
  // It's required to make sure `dispose` waits for `end` to complete.
  await tickMs(100);
  mockStreamEndFinished();
  callback();
});

const timestamp = new Date(Date.UTC(2012, 1, 1));
const mockConsoleLog = jest.spyOn(global.console, 'log').mockImplementation(() => {
  // noop
});
jest.spyOn(global, 'Date').mockImplementation(() => timestamp);

beforeEach(() => {
  mockCreateWriteStream.write.mockClear();
  mockCreateWriteStream.end.mockClear();
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
  expect(mockCreateWriteStream.write).not.toHaveBeenCalled();

  const loggingConfigSchema = LoggingConfig.schema;
  const config = new LoggingConfig(
    loggingConfigSchema.validate({
      appenders: {
        default: {
          kind: 'console',
          layout: { kind: 'pattern' },
        },
        file: {
          kind: 'file',
          layout: { kind: 'pattern' },
          path: 'path',
        },
      },
      loggers: [
        {
          appenders: ['file'],
          context: 'tests',
          level: 'warn',
        },
        {
          context: 'tests.child',
          level: 'error',
        },
      ],
    })
  );

  factory.updateConfig(config);

  // Now all logs should added to configured appenders.
  expect(mockConsoleLog).toHaveBeenCalledTimes(1);
  expect(mockConsoleLog).toHaveBeenCalledWith(
    '[2012-02-01T00:00:00.000Z][INFO ][some-context] You know, just for your info.'
  );

  expect(mockCreateWriteStream.write).toHaveBeenCalledTimes(2);
  expect(mockCreateWriteStream.write).toHaveBeenCalledWith(
    '[2012-02-01T00:00:00.000Z][WARN ][tests] Config is not ready!\n'
  );
  expect(mockCreateWriteStream.write).toHaveBeenCalledWith(
    '[2012-02-01T00:00:00.000Z][ERROR][tests.child] Too bad that config is not ready :/\n'
  );
});

test('`get()` returns `root` logger if context is not specified.', () => {
  const loggingConfigSchema = LoggingConfig.schema;
  const factory = new MutableLoggerFactory({} as any);
  const config = loggingConfigSchema.validate({
    appenders: {
      default: {
        kind: 'console',
        layout: { kind: 'pattern' },
      },
    },
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

  const loggingConfigSchema = LoggingConfig.schema;
  const config = new LoggingConfig(
    loggingConfigSchema.validate({
      appenders: {
        default: {
          kind: 'file',
          layout: { kind: 'pattern' },
          path: 'path',
        },
      },
    })
  );

  factory.updateConfig(config);

  const logger = factory.get('some-context');
  logger.info('You know, just for your info.');

  expect(mockCreateWriteStream.write).toHaveBeenCalled();
  expect(mockCreateWriteStream.end).not.toHaveBeenCalled();

  await factory.close();

  expect(mockCreateWriteStream.end).toHaveBeenCalledTimes(1);
  expect(mockCreateWriteStream.end).toHaveBeenCalledWith(
    undefined,
    undefined,
    expect.any(Function)
  );
  expect(mockStreamEndFinished).toHaveBeenCalled();
});
