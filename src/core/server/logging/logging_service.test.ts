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

const mockStreamWrite = jest.fn();
jest.mock('fs', () => ({
  constants: {},
  createWriteStream: jest.fn(() => ({ write: mockStreamWrite })),
}));

const timestamp = new Date(Date.UTC(2012, 1, 1));
let mockConsoleLog: jest.SpyInstance;

import { createWriteStream } from 'fs';
const mockCreateWriteStream = (createWriteStream as unknown) as jest.Mock<typeof createWriteStream>;

import { LoggingService, config } from '.';

let service: LoggingService;
beforeEach(() => {
  mockConsoleLog = jest.spyOn(global.console, 'log').mockReturnValue(undefined);
  jest.spyOn<any, any>(global, 'Date').mockImplementation(() => timestamp);
  service = new LoggingService();
});

afterEach(() => {
  jest.restoreAllMocks();
  mockCreateWriteStream.mockClear();
  mockStreamWrite.mockClear();
});

test('uses default memory buffer logger until config is provided', () => {
  const bufferAppendSpy = jest.spyOn((service as any).bufferAppender, 'append');

  const logger = service.get('test', 'context');
  logger.trace('trace message');

  // We shouldn't create new buffer appender for another context.
  const anotherLogger = service.get('test', 'context2');
  anotherLogger.fatal('fatal message', { some: 'value' });

  expect(bufferAppendSpy.mock.calls).toMatchSnapshot();
});

test('flushes memory buffer logger and switches to real logger once config is provided', () => {
  const logger = service.get('test', 'context');

  logger.trace('buffered trace message');
  logger.info('buffered info message', { some: 'value' });
  logger.fatal('buffered fatal message');

  const bufferAppendSpy = jest.spyOn((service as any).bufferAppender, 'append');

  // Switch to console appender with `info` level, so that `trace` message won't go through.
  service.upgrade(
    config.schema.validate({
      appenders: { default: { kind: 'console', layout: { kind: 'json' } } },
      root: { level: 'info' },
    })
  );

  expect(mockConsoleLog.mock.calls).toMatchSnapshot('buffered messages');
  mockConsoleLog.mockClear();

  // Now message should go straight to thew newly configured appender, not buffered one.
  logger.info('some new info message');
  expect(mockConsoleLog.mock.calls).toMatchSnapshot('new messages');
  expect(bufferAppendSpy).not.toHaveBeenCalled();
});

test('appends records via multiple appenders.', () => {
  const loggerWithoutConfig = service.get('some-context');
  const testsLogger = service.get('tests');
  const testsChildLogger = service.get('tests', 'child');

  loggerWithoutConfig.info('You know, just for your info.');
  testsLogger.warn('Config is not ready!');
  testsChildLogger.error('Too bad that config is not ready :/');
  testsChildLogger.info('Just some info that should not be logged.');

  expect(mockConsoleLog).not.toHaveBeenCalled();
  expect(mockCreateWriteStream).not.toHaveBeenCalled();

  service.upgrade(
    config.schema.validate({
      appenders: {
        default: { kind: 'console', layout: { kind: 'pattern' } },
        file: { kind: 'file', layout: { kind: 'pattern' }, path: 'path' },
      },
      loggers: [
        { appenders: ['file'], context: 'tests', level: 'warn' },
        { context: 'tests.child', level: 'error' },
      ],
    })
  );

  // Now all logs should added to configured appenders.
  expect(mockConsoleLog.mock.calls).toMatchSnapshot('console logs');
  expect(mockStreamWrite.mock.calls).toMatchSnapshot('file logs');
});

test('uses `root` logger if context is not specified.', () => {
  service.upgrade(
    config.schema.validate({
      appenders: { default: { kind: 'console', layout: { kind: 'pattern' } } },
    })
  );

  const rootLogger = service.get();
  rootLogger.info('This message goes to a root context.');

  expect(mockConsoleLog.mock.calls).toMatchSnapshot();
});

test('`stop()` disposes all appenders.', async () => {
  service.upgrade(
    config.schema.validate({
      appenders: { default: { kind: 'console', layout: { kind: 'json' } } },
      root: { level: 'info' },
    })
  );

  const bufferDisposeSpy = jest.spyOn((service as any).bufferAppender, 'dispose');
  const consoleDisposeSpy = jest.spyOn((service as any).appenders.get('default'), 'dispose');

  await service.stop();

  expect(bufferDisposeSpy).toHaveBeenCalledTimes(1);
  expect(consoleDisposeSpy).toHaveBeenCalledTimes(1);
});

test('asLoggerFactory() only allows to create new loggers.', () => {
  const logger = service.asLoggerFactory().get('test', 'context');

  service.upgrade(
    config.schema.validate({
      appenders: { default: { kind: 'console', layout: { kind: 'json' } } },
      root: { level: 'all' },
    })
  );

  logger.trace('buffered trace message');
  logger.info('buffered info message', { some: 'value' });
  logger.fatal('buffered fatal message');

  expect(Object.keys(service.asLoggerFactory())).toEqual(['get']);
  expect(mockConsoleLog.mock.calls).toMatchSnapshot();
});
