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

import { LoggingConfig } from './logging_config';
import { Appender } from './appenders/appenders';
import { LogLevel } from './log_level';
import { BaseLogger } from './logger';

const context = LoggingConfig.getLoggerContext(['context', 'parent', 'child']);
let appenderMocks: Appender[];
let logger: BaseLogger;
const timestamp = new Date(2012, 1, 1);
beforeEach(() => {
  jest.spyOn<any, any>(global, 'Date').mockImplementation(() => timestamp);

  appenderMocks = [{ append: jest.fn() }, { append: jest.fn() }];
  logger = new BaseLogger(context, LogLevel.All, appenderMocks);
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('`trace()` correctly forms `LogRecord` and passes it to all appenders.', () => {
  logger.trace('message-1');
  for (const appenderMock of appenderMocks) {
    expect(appenderMock.append).toHaveBeenCalledTimes(1);
    expect(appenderMock.append).toHaveBeenCalledWith({
      context,
      error: undefined,
      level: LogLevel.Trace,
      message: 'message-1',
      meta: undefined,
      timestamp,
    });
  }

  logger.trace('message-2', { trace: true });
  for (const appenderMock of appenderMocks) {
    expect(appenderMock.append).toHaveBeenCalledTimes(2);
    expect(appenderMock.append).toHaveBeenCalledWith({
      context,
      error: undefined,
      level: LogLevel.Trace,
      message: 'message-2',
      meta: { trace: true },
      timestamp,
    });
  }
});

test('`debug()` correctly forms `LogRecord` and passes it to all appenders.', () => {
  logger.debug('message-1');
  for (const appenderMock of appenderMocks) {
    expect(appenderMock.append).toHaveBeenCalledTimes(1);
    expect(appenderMock.append).toHaveBeenCalledWith({
      context,
      error: undefined,
      level: LogLevel.Debug,
      message: 'message-1',
      meta: undefined,
      timestamp,
    });
  }

  logger.debug('message-2', { debug: true });
  for (const appenderMock of appenderMocks) {
    expect(appenderMock.append).toHaveBeenCalledTimes(2);
    expect(appenderMock.append).toHaveBeenCalledWith({
      context,
      error: undefined,
      level: LogLevel.Debug,
      message: 'message-2',
      meta: { debug: true },
      timestamp,
    });
  }
});

test('`info()` correctly forms `LogRecord` and passes it to all appenders.', () => {
  logger.info('message-1');
  for (const appenderMock of appenderMocks) {
    expect(appenderMock.append).toHaveBeenCalledTimes(1);
    expect(appenderMock.append).toHaveBeenCalledWith({
      context,
      error: undefined,
      level: LogLevel.Info,
      message: 'message-1',
      meta: undefined,
      timestamp,
    });
  }

  logger.info('message-2', { info: true });
  for (const appenderMock of appenderMocks) {
    expect(appenderMock.append).toHaveBeenCalledTimes(2);
    expect(appenderMock.append).toHaveBeenCalledWith({
      context,
      error: undefined,
      level: LogLevel.Info,
      message: 'message-2',
      meta: { info: true },
      timestamp,
    });
  }
});

test('`warn()` correctly forms `LogRecord` and passes it to all appenders.', () => {
  logger.warn('message-1');
  for (const appenderMock of appenderMocks) {
    expect(appenderMock.append).toHaveBeenCalledTimes(1);
    expect(appenderMock.append).toHaveBeenCalledWith({
      context,
      error: undefined,
      level: LogLevel.Warn,
      message: 'message-1',
      meta: undefined,
      timestamp,
    });
  }

  const error = new Error('message-2');
  logger.warn(error);
  for (const appenderMock of appenderMocks) {
    expect(appenderMock.append).toHaveBeenCalledTimes(2);
    expect(appenderMock.append).toHaveBeenCalledWith({
      context,
      error,
      level: LogLevel.Warn,
      message: 'message-2',
      meta: undefined,
      timestamp,
    });
  }

  logger.warn('message-3', { warn: true });
  for (const appenderMock of appenderMocks) {
    expect(appenderMock.append).toHaveBeenCalledTimes(3);
    expect(appenderMock.append).toHaveBeenCalledWith({
      context,
      error: undefined,
      level: LogLevel.Warn,
      message: 'message-3',
      meta: { warn: true },
      timestamp,
    });
  }
});

test('`error()` correctly forms `LogRecord` and passes it to all appenders.', () => {
  logger.error('message-1');
  for (const appenderMock of appenderMocks) {
    expect(appenderMock.append).toHaveBeenCalledTimes(1);
    expect(appenderMock.append).toHaveBeenCalledWith({
      context,
      error: undefined,
      level: LogLevel.Error,
      message: 'message-1',
      meta: undefined,
      timestamp,
    });
  }

  const error = new Error('message-2');
  logger.error(error);
  for (const appenderMock of appenderMocks) {
    expect(appenderMock.append).toHaveBeenCalledTimes(2);
    expect(appenderMock.append).toHaveBeenCalledWith({
      context,
      error,
      level: LogLevel.Error,
      message: 'message-2',
      meta: undefined,
      timestamp,
    });
  }

  logger.error('message-3', { error: true });
  for (const appenderMock of appenderMocks) {
    expect(appenderMock.append).toHaveBeenCalledTimes(3);
    expect(appenderMock.append).toHaveBeenCalledWith({
      context,
      error: undefined,
      level: LogLevel.Error,
      message: 'message-3',
      meta: { error: true },
      timestamp,
    });
  }
});

test('`fatal()` correctly forms `LogRecord` and passes it to all appenders.', () => {
  logger.fatal('message-1');
  for (const appenderMock of appenderMocks) {
    expect(appenderMock.append).toHaveBeenCalledTimes(1);
    expect(appenderMock.append).toHaveBeenCalledWith({
      context,
      error: undefined,
      level: LogLevel.Fatal,
      message: 'message-1',
      meta: undefined,
      timestamp,
    });
  }

  const error = new Error('message-2');
  logger.fatal(error);
  for (const appenderMock of appenderMocks) {
    expect(appenderMock.append).toHaveBeenCalledTimes(2);
    expect(appenderMock.append).toHaveBeenCalledWith({
      context,
      error,
      level: LogLevel.Fatal,
      message: 'message-2',
      meta: undefined,
      timestamp,
    });
  }

  logger.fatal('message-3', { fatal: true });
  for (const appenderMock of appenderMocks) {
    expect(appenderMock.append).toHaveBeenCalledTimes(3);
    expect(appenderMock.append).toHaveBeenCalledWith({
      context,
      error: undefined,
      level: LogLevel.Fatal,
      message: 'message-3',
      meta: { fatal: true },
      timestamp,
    });
  }
});

test('`log()` just passes the record to all appenders.', () => {
  const record = {
    context,
    level: LogLevel.Info,
    message: 'message-1',
    timestamp,
  };

  logger.log(record);

  for (const appenderMock of appenderMocks) {
    expect(appenderMock.append).toHaveBeenCalledTimes(1);
    expect(appenderMock.append).toHaveBeenCalledWith(record);
  }
});

test('logger with `Off` level does not pass any records to appenders.', () => {
  const turnedOffLogger = new BaseLogger(context, LogLevel.Off, appenderMocks);
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
      level: LogLevel.Trace,
      message: 'trace-message',
      timestamp,
    });
  }

  catchAllLogger.debug('debug-message');
  for (const appenderMock of appenderMocks) {
    expect(appenderMock.append).toHaveBeenCalledTimes(2);
    expect(appenderMock.append).toHaveBeenCalledWith({
      context,
      level: LogLevel.Debug,
      message: 'debug-message',
      timestamp,
    });
  }

  catchAllLogger.info('info-message');
  for (const appenderMock of appenderMocks) {
    expect(appenderMock.append).toHaveBeenCalledTimes(3);
    expect(appenderMock.append).toHaveBeenCalledWith({
      context,
      level: LogLevel.Info,
      message: 'info-message',
      timestamp,
    });
  }

  catchAllLogger.warn('warn-message');
  for (const appenderMock of appenderMocks) {
    expect(appenderMock.append).toHaveBeenCalledTimes(4);
    expect(appenderMock.append).toHaveBeenCalledWith({
      context,
      level: LogLevel.Warn,
      message: 'warn-message',
      timestamp,
    });
  }

  catchAllLogger.error('error-message');
  for (const appenderMock of appenderMocks) {
    expect(appenderMock.append).toHaveBeenCalledTimes(5);
    expect(appenderMock.append).toHaveBeenCalledWith({
      context,
      level: LogLevel.Error,
      message: 'error-message',
      timestamp,
    });
  }

  catchAllLogger.fatal('fatal-message');
  for (const appenderMock of appenderMocks) {
    expect(appenderMock.append).toHaveBeenCalledTimes(6);
    expect(appenderMock.append).toHaveBeenCalledWith({
      context,
      level: LogLevel.Fatal,
      message: 'fatal-message',
      timestamp,
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
      level: LogLevel.Warn,
      message: 'warn-message',
      timestamp,
    });
  }

  warnLogger.error('error-message');
  for (const appenderMock of appenderMocks) {
    expect(appenderMock.append).toHaveBeenCalledTimes(2);
    expect(appenderMock.append).toHaveBeenCalledWith({
      context,
      level: LogLevel.Error,
      message: 'error-message',
      timestamp,
    });
  }

  warnLogger.fatal('fatal-message');
  for (const appenderMock of appenderMocks) {
    expect(appenderMock.append).toHaveBeenCalledTimes(3);
    expect(appenderMock.append).toHaveBeenCalledWith({
      context,
      level: LogLevel.Fatal,
      message: 'fatal-message',
      timestamp,
    });
  }
});
