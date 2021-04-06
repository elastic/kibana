/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
