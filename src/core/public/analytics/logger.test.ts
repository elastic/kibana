/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { LogRecord } from '@kbn/logging';
import { createLogger } from './logger';

describe('createLogger', () => {
  // Calling `.mockImplementation` on all of them to avoid jest logging the console usage
  const logErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  const logWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
  const logInfoSpy = jest.spyOn(console, 'info').mockImplementation();
  const logDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
  const logTraceSpy = jest.spyOn(console, 'trace').mockImplementation();
  const logLogSpy = jest.spyOn(console, 'log').mockImplementation();

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
    expect(logErrorSpy).toHaveBeenCalled();
    logger.error('error');
    expect(logErrorSpy).toHaveBeenCalled();
    logger.warn('warn');
    expect(logWarnSpy).toHaveBeenCalled();
    logger.info('info');
    expect(logInfoSpy).toHaveBeenCalled();
    logger.debug('debug');
    expect(logDebugSpy).toHaveBeenCalled();
    logger.trace('trace');
    expect(logTraceSpy).toHaveBeenCalled();
    logger.log({} as LogRecord);
    expect(logLogSpy).toHaveBeenCalled();
    logger.get().warn('warn');
    expect(logWarnSpy).toHaveBeenCalled();
  });
});
