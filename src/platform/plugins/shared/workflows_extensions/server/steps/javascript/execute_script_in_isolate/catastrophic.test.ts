/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable max-classes-per-file */

import type { ScriptLogger } from '.';

interface IsolateOptions {
  memoryLimit?: number;
  onCatastrophicError?: (message: string) => void;
}

let mockCapturedOnCatastrophicError: ((message: string) => void) | undefined;
let mockIsolateDisposed = false;

const mockDispose = jest.fn(() => {
  mockIsolateDisposed = true;
});

const mockEvalClosure = jest.fn(() => new Promise(() => {}));

jest.mock('isolated-vm', () => {
  class MockReference {}

  class MockIsolate {
    constructor(options: IsolateOptions) {
      mockCapturedOnCatastrophicError = options.onCatastrophicError;
    }

    public get isDisposed() {
      return mockIsolateDisposed;
    }

    createContext = jest.fn(async () => ({
      global: {
        set: jest.fn(async () => undefined),
        delete: jest.fn(async () => undefined),
        derefInto: jest.fn(() => ({})),
      },
      eval: jest.fn(async () => undefined),
      evalClosure: mockEvalClosure,
    }));

    dispose = mockDispose;
  }

  return {
    __esModule: true,
    default: {
      Isolate: MockIsolate,
      Reference: MockReference,
    },
  };
});

import { executeScriptInIsolate } from '.';
import { createScriptOutOfMemoryMessage } from './normalize_isolate_execution_error';
import {
  CODE_EXECUTION_TIMEOUT_MS,
  CODE_MAX_CONSOLE_LOG_COUNT,
  CODE_MEMORY_LIMIT_MB,
  ScriptsJavaScriptStepTypeId,
} from '../../../../common/steps/javascript';
import type { StepHandlerContext } from '../../../step_registry/types';
import { scriptsJavaScriptStepDefinition } from '../javascript_step';

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

const defaultIsolateParams = {
  memoryLimitMb: CODE_MEMORY_LIMIT_MB,
  executionTimeoutMs: CODE_EXECUTION_TIMEOUT_MS,
  maxConsoleLogCount: CODE_MAX_CONSOLE_LOG_COUNT,
};

describe('executeScriptInIsolate catastrophic OOM handling', () => {
  const abortSpy = jest.spyOn(process, 'abort').mockImplementation(() => {
    throw new Error('process.abort should not be called');
  });

  beforeEach(() => {
    mockCapturedOnCatastrophicError = undefined;
    mockIsolateDisposed = false;
    mockDispose.mockClear();
    mockEvalClosure.mockClear();
    abortSpy.mockClear();
  });

  afterAll(() => {
    abortSpy.mockRestore();
  });

  it('registers onCatastrophicError when creating the isolate', async () => {
    const execution = executeScriptInIsolate({
      script: 'return 1;',
      logger: createLogger(),
      abortSignal: new AbortController().signal,
      ...defaultIsolateParams,
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockCapturedOnCatastrophicError).toEqual(expect.any(Function));

    mockCapturedOnCatastrophicError?.('heap corruption');

    await expect(execution).rejects.toThrow(
      'Script isolate encountered a catastrophic error: heap corruption'
    );
    expect(abortSpy).not.toHaveBeenCalled();
  });

  it('logs, disposes the isolate, and rejects without calling process.abort', async () => {
    const logger = createLogger();

    const execution = executeScriptInIsolate({
      script: 'return 1;',
      logger,
      abortSignal: new AbortController().signal,
      ...defaultIsolateParams,
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    mockCapturedOnCatastrophicError?.('out of memory');

    await expect(execution).rejects.toThrow(createScriptOutOfMemoryMessage(CODE_MEMORY_LIMIT_MB));
    expect(logger.error).toHaveBeenCalledWith(
      'JavaScript step isolate catastrophic error',
      expect.objectContaining({
        message: 'Script isolate encountered a catastrophic error: out of memory',
      })
    );
    expect(mockDispose).toHaveBeenCalled();
    expect(abortSpy).not.toHaveBeenCalled();
  });
});

describe('scriptsJavaScriptStepDefinition catastrophic OOM handling', () => {
  const abortSpy = jest.spyOn(process, 'abort').mockImplementation(() => {
    throw new Error('process.abort should not be called');
  });

  beforeEach(() => {
    mockCapturedOnCatastrophicError = undefined;
    mockIsolateDisposed = false;
    mockDispose.mockClear();
    mockEvalClosure.mockClear();
    abortSpy.mockClear();
  });

  afterAll(() => {
    abortSpy.mockRestore();
  });

  it('returns a step error when the isolate reports a catastrophic failure', async () => {
    const context: StepHandlerContext<any, any> = {
      config: {},
      input: { code: 'return 1;' },
      rawInput: { code: 'return 1;' },
      contextManager: { getContext: jest.fn() } as any,
      logger: createLogger(),
      abortSignal: new AbortController().signal,
      stepId: 'test-step',
      stepType: ScriptsJavaScriptStepTypeId,
    };

    const execution = scriptsJavaScriptStepDefinition.handler(context);

    await new Promise((resolve) => setTimeout(resolve, 10));

    mockCapturedOnCatastrophicError?.('isolate failure');

    const result = await execution;

    expect(result.error?.message).toBe(
      'Script isolate encountered a catastrophic error: isolate failure'
    );
    expect(abortSpy).not.toHaveBeenCalled();
  });
});
