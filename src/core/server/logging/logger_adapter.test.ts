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

import { Logger } from '.';
import { LoggerAdapter } from './logger_adapter';

test('proxies all method calls to the internal logger.', () => {
  const internalLogger: Logger = {
    debug: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    info: jest.fn(),
    log: jest.fn(),
    trace: jest.fn(),
    warn: jest.fn(),
    get: jest.fn(),
  };

  const adapter = new LoggerAdapter(internalLogger);

  adapter.trace('trace-message');
  expect(internalLogger.trace).toHaveBeenCalledTimes(1);
  expect(internalLogger.trace).toHaveBeenCalledWith('trace-message', undefined);

  adapter.debug('debug-message');
  expect(internalLogger.debug).toHaveBeenCalledTimes(1);
  expect(internalLogger.debug).toHaveBeenCalledWith('debug-message', undefined);

  adapter.info('info-message');
  expect(internalLogger.info).toHaveBeenCalledTimes(1);
  expect(internalLogger.info).toHaveBeenCalledWith('info-message', undefined);

  adapter.warn('warn-message');
  expect(internalLogger.warn).toHaveBeenCalledTimes(1);
  expect(internalLogger.warn).toHaveBeenCalledWith('warn-message', undefined);

  adapter.error('error-message');
  expect(internalLogger.error).toHaveBeenCalledTimes(1);
  expect(internalLogger.error).toHaveBeenCalledWith('error-message', undefined);

  adapter.fatal('fatal-message');
  expect(internalLogger.fatal).toHaveBeenCalledTimes(1);
  expect(internalLogger.fatal).toHaveBeenCalledWith('fatal-message', undefined);

  adapter.get('context');
  expect(internalLogger.get).toHaveBeenCalledTimes(1);
  expect(internalLogger.get).toHaveBeenCalledWith('context');
});

test('forwards all method calls to new internal logger if it is updated.', () => {
  const oldInternalLogger: Logger = {
    debug: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    info: jest.fn(),
    log: jest.fn(),
    trace: jest.fn(),
    warn: jest.fn(),
    get: jest.fn(),
  };

  const newInternalLogger: Logger = {
    debug: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    info: jest.fn(),
    log: jest.fn(),
    trace: jest.fn(),
    warn: jest.fn(),
    get: jest.fn(),
  };

  const adapter = new LoggerAdapter(oldInternalLogger);

  adapter.trace('trace-message');
  expect(oldInternalLogger.trace).toHaveBeenCalledTimes(1);
  expect(oldInternalLogger.trace).toHaveBeenCalledWith('trace-message', undefined);
  (oldInternalLogger.trace as jest.Mock<() => void>).mockReset();

  adapter.updateLogger(newInternalLogger);
  adapter.trace('trace-message');
  expect(oldInternalLogger.trace).not.toHaveBeenCalled();
  expect(newInternalLogger.trace).toHaveBeenCalledTimes(1);
  expect(newInternalLogger.trace).toHaveBeenCalledWith('trace-message', undefined);
});
