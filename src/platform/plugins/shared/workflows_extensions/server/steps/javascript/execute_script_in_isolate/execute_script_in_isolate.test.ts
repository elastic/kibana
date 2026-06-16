/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { executeScriptInIsolate, type ScriptLogger } from '.';
import { SCRIPT_OUT_OF_MEMORY_MESSAGE } from './normalize_isolate_execution_error';
import {
  MAX_CONSOLE_LOG_COUNT,
  SCRIPT_EXECUTION_TIMEOUT_MS,
  SCRIPT_MEMORY_LIMIT_MB,
} from '../../../../common/steps/javascript';

const defaultIsolateParams = {
  memoryLimitMb: SCRIPT_MEMORY_LIMIT_MB,
  executionTimeoutMs: SCRIPT_EXECUTION_TIMEOUT_MS,
  maxConsoleLogCount: MAX_CONSOLE_LOG_COUNT,
};

const createLogger = (): ScriptLogger & {
  debug: jest.Mock;
  info: jest.Mock;
  warn: jest.Mock;
  error: jest.Mock;
} => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
});

describe('executeScriptInIsolate', () => {
  it('executes script asynchronously and returns the result', async () => {
    const result = await executeScriptInIsolate({
      script: "return { greeting: 'Hello, World' };",
      logger: createLogger(),
      abortSignal: new AbortController().signal,
      ...defaultIsolateParams,
    });

    expect(result).toEqual({ greeting: 'Hello, World' });
  });

  it('routes console calls to the step logger', async () => {
    const logger = createLogger();

    await executeScriptInIsolate({
      script: `
        console.log('log message');
        console.info('info message');
        console.warn('warn message');
        console.error('error message');
        console.debug('debug message');
        return true;
      `,
      logger,
      abortSignal: new AbortController().signal,
      ...defaultIsolateParams,
    });

    expect(logger.info).toHaveBeenCalledWith('log message');
    expect(logger.info).toHaveBeenCalledWith('info message');
    expect(logger.warn).toHaveBeenCalledWith('warn message');
    expect(logger.error).toHaveBeenCalledWith('error message');
    expect(logger.debug).toHaveBeenCalledWith('debug message');
  });

  it('silently drops console logs after the cap is reached', async () => {
    const logger = createLogger();

    const result = await executeScriptInIsolate({
      script: `
        for (let i = 0; i < 150; i++) {
          console.log('message-' + i);
        }
        return 42;
      `,
      logger,
      abortSignal: new AbortController().signal,
      ...defaultIsolateParams,
    });

    expect(result).toBe(42);
    expect(logger.info).toHaveBeenCalledTimes(MAX_CONSOLE_LOG_COUNT);
  });

  it('does not expose host data to user scripts', async () => {
    const result = await executeScriptInIsolate({
      script: 'return { context: typeof context, input: typeof input };',
      logger: createLogger(),
      abortSignal: new AbortController().signal,
      ...defaultIsolateParams,
    });

    expect(result).toEqual({ context: 'undefined', input: 'undefined' });
  });

  it('does not expose __logBridge__ to user scripts', async () => {
    const result = await executeScriptInIsolate({
      script: 'return typeof __logBridge__;',
      logger: createLogger(),
      abortSignal: new AbortController().signal,
      ...defaultIsolateParams,
    });

    expect(result).toBe('undefined');
  });

  it('executes scripts with await', async () => {
    const result = await executeScriptInIsolate({
      script: 'const value = await Promise.resolve(42); return value;',
      logger: createLogger(),
      abortSignal: new AbortController().signal,
      ...defaultIsolateParams,
    });

    expect(result).toBe(42);
  });

  it('returns primitive values from user scripts', async () => {
    const result = await executeScriptInIsolate({
      script: 'return 42;',
      logger: createLogger(),
      abortSignal: new AbortController().signal,
      ...defaultIsolateParams,
    });

    expect(result).toBe(42);
  });

  it('does not allow wrapper injection via concatenated script payloads', async () => {
    await expect(
      executeScriptInIsolate({
        script: '})(); return 1; (function(){',
        logger: createLogger(),
        abortSignal: new AbortController().signal,
        ...defaultIsolateParams,
      })
    ).rejects.toThrow();
  });

  it(
    'times out script execution after 5 seconds',
    async () => {
      await expect(
        executeScriptInIsolate({
          script: 'while (true) {}',
          logger: createLogger(),
          abortSignal: new AbortController().signal,
          ...defaultIsolateParams,
        })
      ).rejects.toThrow('Script execution timed out.');
    },
    SCRIPT_EXECUTION_TIMEOUT_MS + 2_000
  );

  it('cancels execution when the abort signal fires', async () => {
    const abortController = new AbortController();

    const execution = executeScriptInIsolate({
      script: 'while (true) {}',
      logger: createLogger(),
      abortSignal: abortController.signal,
      ...defaultIsolateParams,
    });

    setTimeout(() => {
      abortController.abort();
    }, 100);

    await expect(execution).rejects.toThrow('Step execution was cancelled');
  });

  it('returns a user-friendly error when an ArrayBuffer allocation exceeds the memory limit', async () => {
    await expect(
      executeScriptInIsolate({
        script: 'new ArrayBuffer(100 * 1024 * 1024);',
        logger: createLogger(),
        abortSignal: new AbortController().signal,
        ...defaultIsolateParams,
      })
    ).rejects.toThrow(SCRIPT_OUT_OF_MEMORY_MESSAGE);
  });
});
