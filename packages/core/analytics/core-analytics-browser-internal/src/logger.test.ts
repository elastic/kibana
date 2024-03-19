/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { LogRecord } from '@kbn/logging';
import { unsafeConsole } from '@kbn/security-hardening';
import { createLogger } from './logger';

describe('createLogger', () => {
  // Calling `.mockImplementation` on all of them to avoid jest logging the console usage
  const logErrorSpy = jest.spyOn(unsafeConsole, 'error').mockImplementation();
  const logWarnSpy = jest.spyOn(unsafeConsole, 'warn').mockImplementation();
  const logInfoSpy = jest.spyOn(unsafeConsole, 'info').mockImplementation();
  const logDebugSpy = jest.spyOn(unsafeConsole, 'debug').mockImplementation();
  const logTraceSpy = jest.spyOn(unsafeConsole, 'trace').mockImplementation();
  const logLogSpy = jest.spyOn(unsafeConsole, 'log').mockImplementation();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should create a logger', () => {
    const logger = createLogger(false);
    expect(logger).toStrictEqual(
      expect.objectContaining({
        fatal: expect.any(Function),
        error: expect.any(Function),
        warn: expect.any(Function),
        info: expect.any(Function),
        debug: expect.any(Function),
        trace: expect.any(Function),
        log: expect.any(Function),
        get: expect.any(Function),
      })
    );
  });

  test('when isDev === false, it should not log anything', () => {
    const logger = createLogger(false);
    logger.fatal('fatal');
    expect(logErrorSpy).not.toHaveBeenCalled();
    logger.error('error');
    expect(logErrorSpy).not.toHaveBeenCalled();
    logger.warn('warn');
    expect(logWarnSpy).not.toHaveBeenCalled();
    logger.info('info');
    expect(logInfoSpy).not.toHaveBeenCalled();
    logger.debug('debug');
    expect(logDebugSpy).not.toHaveBeenCalled();
    logger.trace('trace');
    expect(logTraceSpy).not.toHaveBeenCalled();
    logger.log({} as LogRecord);
    expect(logLogSpy).not.toHaveBeenCalled();
    logger.get().warn('warn');
    expect(logWarnSpy).not.toHaveBeenCalled();
  });

  test('when isDev === true, it should log everything', () => {
    const logger = createLogger(true);
    logger.fatal('fatal');
    expect(logErrorSpy).toHaveBeenCalledTimes(1);
    logger.error('error');
    expect(logErrorSpy).toHaveBeenCalledTimes(2); // fatal + error
    logger.warn('warn');
    expect(logWarnSpy).toHaveBeenCalledTimes(1);
    logger.info('info');
    expect(logInfoSpy).toHaveBeenCalledTimes(1);
    logger.debug('debug');
    expect(logDebugSpy).toHaveBeenCalledTimes(1);
    logger.trace('trace');
    expect(logTraceSpy).toHaveBeenCalledTimes(1);
    logger.log({} as LogRecord);
    expect(logLogSpy).toHaveBeenCalledTimes(1);
    logger.get().warn('warn');
    expect(logWarnSpy).toHaveBeenCalledTimes(2);
  });
});
