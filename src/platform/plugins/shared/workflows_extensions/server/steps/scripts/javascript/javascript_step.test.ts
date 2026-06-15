/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createSHA256Hash } from '@kbn/crypto';
import type { StepHandlerContext } from '../../../step_registry/types';
import {
  executeScriptInIsolate,
  SCRIPT_MEMORY_LIMIT_MB,
  type ScriptLogger,
} from './execute_script_in_isolate';
import { scriptsJavaScriptStepDefinition } from './javascript_step';

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
    workflowContext?: Record<string, unknown>;
  }
): StepHandlerContext<any, any> => ({
  config,
  input: {},
  rawInput: {},
  contextManager: {
    getContext: jest.fn(
      () =>
        options?.workflowContext ?? {
          workflow: { id: 'workflow-1', name: 'Test Workflow' },
          inputs: { name: 'World' },
          steps: {},
        }
    ),
  } as any,
  logger: createLogger(),
  abortSignal: options?.abortSignal ?? new AbortController().signal,
  stepId: 'test-step',
  stepType: 'scripts.javaScript',
});

describe('executeScriptInIsolate', () => {
  it('executes script asynchronously and returns the result', async () => {
    const result = await executeScriptInIsolate({
      script: "return { greeting: 'Hello, ' + context.inputs.name };",
      context: { inputs: { name: 'World' } },
      logger: createLogger(),
      abortSignal: new AbortController().signal,
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
      context: {},
      logger,
      abortSignal: new AbortController().signal,
    });

    expect(logger.info).toHaveBeenCalledWith('log message');
    expect(logger.info).toHaveBeenCalledWith('info message');
    expect(logger.warn).toHaveBeenCalledWith('warn message');
    expect(logger.error).toHaveBeenCalledWith('error message');
    expect(logger.debug).toHaveBeenCalledWith('debug message');
  });

  it('uses an 8 MB memory limit for the isolate', () => {
    expect(SCRIPT_MEMORY_LIMIT_MB).toBe(8);
  });

  it('cancels execution when the abort signal fires', async () => {
    const abortController = new AbortController();

    const execution = executeScriptInIsolate({
      script: 'while (true) {}',
      context: {},
      logger: createLogger(),
      abortSignal: abortController.signal,
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
      'd3dddfec1936868f4773c055755741af5672b4a220dbd09575ffd0ddd52ac2b7'
    );
  });

  it('returns an error when script is missing', async () => {
    const context = createMockContext({ script: '   ' });
    const result = await scriptsJavaScriptStepDefinition.handler(context);

    expect(result.error?.message).toBe('Script is required');
  });

  it('returns script output from workflow context', async () => {
    const context = createMockContext({
      script: "return { greeting: 'Hello, ' + context.inputs.name };",
    });

    const result = await scriptsJavaScriptStepDefinition.handler(context);

    expect(result.output).toEqual({ greeting: 'Hello, World' });
  });

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
