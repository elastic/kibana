/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createSHA256Hash } from '@kbn/crypto';
import type { ScriptLogger } from './execute_script_in_isolate';
import { createScriptExecutionTimeoutMessage } from './execute_script_in_isolate/normalize_isolate_execution_error';
import { scriptsJavaScriptStepDefinition } from './javascript_step';
import {
  CODE_EXECUTION_TIMEOUT_MS,
  CODE_MAX_LENGTH_CHARS,
  CODE_MEMORY_LIMIT_MB,
  ScriptsJavaScriptStepTypeId,
} from '../../../common/steps/javascript';
import type { StepHandlerContext } from '../../step_registry/types';

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
  input: { code: string },
  options?: {
    abortSignal?: AbortSignal;
  }
): StepHandlerContext<any, any> => ({
  config: {},
  input,
  rawInput: input,
  contextManager: {
    getContext: jest.fn(),
  } as any,
  logger: createLogger(),
  abortSignal: options?.abortSignal ?? new AbortController().signal,
  stepId: 'test-step',
  stepType: ScriptsJavaScriptStepTypeId,
});

describe('scriptsJavaScriptStepDefinition', () => {
  it('has a stable handler hash for approval', () => {
    expect(createSHA256Hash(scriptsJavaScriptStepDefinition.handler.toString())).toBe(
      'ddf0b743e6ae5614c6006233912d8c8314f02f2d86a8150fb550edd931eb6524'
    );
  });

  it('uses an 8 MB memory limit for the isolate', () => {
    expect(CODE_MEMORY_LIMIT_MB).toBe(8);
  });

  it('returns an error when code is missing', async () => {
    const context = createMockContext({ code: '   ' });
    const result = await scriptsJavaScriptStepDefinition.handler(context);

    expect(result.error?.message).toBe('Code is required');
  });

  it('returns an error when code exceeds the maximum size after template rendering', async () => {
    const context = createMockContext({
      code: 'x'.repeat(CODE_MAX_LENGTH_CHARS + 1),
    });

    const result = await scriptsJavaScriptStepDefinition.handler(context);

    expect(result.error?.message).toContain('exceeds maximum allowed size of 1 MB');
    expect(result.error?.message).toContain('Reduce interpolated data or split the workflow');
  });

  it('returns code output without passing host data into the sandbox', async () => {
    const context = createMockContext({
      code: "return { greeting: 'Hello, World' };",
    });

    const result = await scriptsJavaScriptStepDefinition.handler(context);

    expect(result.output).toEqual({ greeting: 'Hello, World' });
    expect(context.contextManager.getContext).not.toHaveBeenCalled();
  });

  it(
    'returns a timeout error when script execution exceeds 5 seconds',
    async () => {
      const context = createMockContext({ code: 'while (true) {}' });

      const result = await scriptsJavaScriptStepDefinition.handler(context);

      expect(result.error?.message).toBe(
        createScriptExecutionTimeoutMessage(CODE_EXECUTION_TIMEOUT_MS)
      );
    },
    CODE_EXECUTION_TIMEOUT_MS + 2_000
  );

  it('returns a cancellation error when aborted before execution completes', async () => {
    const abortController = new AbortController();
    const context = createMockContext(
      { code: 'while (true) {}' },
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
