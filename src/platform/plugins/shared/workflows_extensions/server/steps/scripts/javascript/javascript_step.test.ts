/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createSHA256Hash } from '@kbn/crypto';
import { executeScriptInIsolate, type ScriptLogger } from './execute_script_in_isolate';
import {
  MAX_CONSOLE_LOG_COUNT,
  SCRIPT_EXECUTION_TIMEOUT_MS,
  SCRIPT_MAX_LENGTH_CHARS,
  SCRIPT_MEMORY_LIMIT_MB,
  scriptsJavaScriptStepDefinition,
} from './javascript_step';
import type { StepHandlerContext } from '../../../step_registry/types';

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

const createMockContext = (
  config: { script: string },
  options?: {
    abortSignal?: AbortSignal;
  }
): StepHandlerContext<any, any> => ({
  config,
  input: {},
  rawInput: {},
  contextManager: {
    getContext: jest.fn(),
  } as any,
  logger: createLogger(),
  abortSignal: options?.abortSignal ?? new AbortController().signal,
  stepId: 'test-step',
  stepType: 'scripts.javaScript',
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
});

describe('scriptsJavaScriptStepDefinition', () => {
  it('has a stable handler hash for approval', () => {
    expect(createSHA256Hash(scriptsJavaScriptStepDefinition.handler.toString())).toBe(
      '7b95d163f0651645ce01cab312f318f89c840fdba9a234cbccb4d1e198ddf23c'
    );
  });

  it('uses an 8 MB memory limit for the isolate', () => {
    expect(SCRIPT_MEMORY_LIMIT_MB).toBe(8);
  });

  it('returns an error when script is missing', async () => {
    const context = createMockContext({ script: '   ' });
    const result = await scriptsJavaScriptStepDefinition.handler(context);

    expect(result.error?.message).toBe('Script is required');
  });

  it('returns an error when script exceeds the maximum size after template rendering', async () => {
    const context = createMockContext({
      script: 'x'.repeat(SCRIPT_MAX_LENGTH_CHARS + 1),
    });

    const result = await scriptsJavaScriptStepDefinition.handler(context);

    expect(result.error?.message).toContain('exceeds maximum allowed size of 1 MB');
    expect(result.error?.message).toContain('Reduce interpolated data or split the workflow');
  });

  it('returns script output without passing host data into the sandbox', async () => {
    const context = createMockContext({
      script: "return { greeting: 'Hello, World' };",
    });

    const result = await scriptsJavaScriptStepDefinition.handler(context);

    expect(result.output).toEqual({ greeting: 'Hello, World' });
    expect(context.contextManager.getContext).not.toHaveBeenCalled();
  });

  it(
    'returns a timeout error when script execution exceeds 5 seconds',
    async () => {
      const context = createMockContext({ script: 'while (true) {}' });

      const result = await scriptsJavaScriptStepDefinition.handler(context);

      expect(result.error?.message).toBe('Script execution timed out.');
    },
    SCRIPT_EXECUTION_TIMEOUT_MS + 2_000
  );

  it('returns a cancellation error when aborted before execution completes', async () => {
    const abortController = new AbortController();
    const context = createMockContext(
      { script: 'while (true) {}' },
      { abortSignal: abortController.signal }
    );

    const execution = scriptsJavaScriptStepDefinition.handler(context);

    setTimeout(() => {
      abortController.abort();
    }, 100);

    const result = await execution;

    expect(result.error?.message).toBe('Step execution was cancelled');
  });
});
