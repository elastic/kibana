/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { HITL_TOKEN_EXPIRES_AT_INPUT_FIELD, HITL_TOKEN_HASH_INPUT_FIELD } from '@kbn/workflows';
import { computeTokenHmac } from '@kbn/workflows/server';
import {
  invalidateHitlExternalResumeTokenIfPresent,
  mintHitlExternalResumeToken,
  persistHitlExternalResumeToken,
  removeHitlExternalResumeTokenFields,
} from './hitl_external_resume_helpers';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';

describe('mintHitlExternalResumeToken', () => {
  const waitingRuntime = {
    stepExecutionId: 'step-exec-1',
    stepExecution: { startedAt: '2026-01-01T00:00:00.000Z' },
  } as StepExecutionRuntime;

  it('expires at startedAt plus timeout', () => {
    const result = mintHitlExternalResumeToken({
      stepExecutionRuntime: waitingRuntime,
      execution: { id: 'execution-id', workflowId: 'workflow-id' } as Parameters<
        typeof mintHitlExternalResumeToken
      >[0]['execution'],
      timeout: '2w',
    });

    expect(result.token).toHaveLength(64);
    expect(result.tokenHash).toHaveLength(64);
    expect(result.expiresAt).toBe('2026-01-15T00:00:00.000Z');
  });

  it('ignores Date.now() when startedAt is earlier', () => {
    jest.useFakeTimers();
    try {
      jest.setSystemTime(new Date('2026-01-01T00:00:05.000Z'));

      const result = mintHitlExternalResumeToken({
        stepExecutionRuntime: waitingRuntime,
        execution: { id: 'execution-id', workflowId: 'workflow-id' } as Parameters<
          typeof mintHitlExternalResumeToken
        >[0]['execution'],
        timeout: '30s',
      });

      expect(result.expiresAt).toBe('2026-01-01T00:00:30.000Z');
    } finally {
      jest.useRealTimers();
    }
  });

  it('throws when the wait has no startedAt', () => {
    expect(() =>
      mintHitlExternalResumeToken({
        stepExecutionRuntime: { stepExecutionId: 'step-exec-1' } as StepExecutionRuntime,
        execution: { id: 'execution-id', workflowId: 'workflow-id' } as Parameters<
          typeof mintHitlExternalResumeToken
        >[0]['execution'],
        timeout: '30s',
      })
    ).toThrow('HITL resume token requires a started wait');
  });

  it('produces an HMAC that binds executionId, stepExecutionId, and expiresAt', () => {
    const result = mintHitlExternalResumeToken({
      stepExecutionRuntime: waitingRuntime,
      execution: { id: 'exec-1', workflowId: 'wf-1' } as Parameters<
        typeof mintHitlExternalResumeToken
      >[0]['execution'],
      timeout: '1h',
    });

    const expectedHmac = computeTokenHmac(result.token, 'exec-1', 'step-exec-1', result.expiresAt);
    expect(result.tokenHash).toBe(expectedHmac);
  });

  it('HMAC changes when executionId differs', () => {
    const token = 'a'.repeat(64);
    const expiresAt = '2026-01-01T00:00:00.000Z';
    const h1 = computeTokenHmac(token, 'exec-1', 'step-1', expiresAt);
    const h2 = computeTokenHmac(token, 'exec-2', 'step-1', expiresAt);
    expect(h1).not.toBe(h2);
  });

  it('HMAC changes when expiresAt differs', () => {
    const token = 'a'.repeat(64);
    const h1 = computeTokenHmac(token, 'exec-1', 'step-1', '2026-01-01T00:00:00.000Z');
    const h2 = computeTokenHmac(token, 'exec-1', 'step-1', '2099-01-01T00:00:00.000Z');
    expect(h1).not.toBe(h2);
  });
});

describe('removeHitlExternalResumeTokenFields', () => {
  it('nulls legacy token metadata while preserving user input fields', () => {
    expect(
      removeHitlExternalResumeTokenFields({
        message: 'Please respond',
        schema: { type: 'object' },
        [HITL_TOKEN_HASH_INPUT_FIELD]: 'hash',
        [HITL_TOKEN_EXPIRES_AT_INPUT_FIELD]: '2999-01-01T00:00:00.000Z',
      })
    ).toEqual({
      message: 'Please respond',
      schema: { type: 'object' },
      [HITL_TOKEN_HASH_INPUT_FIELD]: null,
      [HITL_TOKEN_EXPIRES_AT_INPUT_FIELD]: null,
    });
  });
});

describe('persistHitlExternalResumeToken', () => {
  it('writes the same token onto step state and step input', () => {
    const setInput = jest.fn();
    const setCurrentStepState = jest.fn();
    const stepExecutionRuntime = {
      getCurrentStepState: jest.fn().mockReturnValue({ dynamicTimeout: '72h' }),
      setCurrentStepState,
      setInput,
    } as unknown as StepExecutionRuntime;

    persistHitlExternalResumeToken(
      stepExecutionRuntime,
      { tokenHash: 'hash', expiresAt: '2999-01-01T00:00:00.000Z' },
      { message: 'Please respond' }
    );

    const tokenFields = {
      [HITL_TOKEN_HASH_INPUT_FIELD]: 'hash',
      [HITL_TOKEN_EXPIRES_AT_INPUT_FIELD]: '2999-01-01T00:00:00.000Z',
    };
    expect(setCurrentStepState).toHaveBeenCalledWith({
      dynamicTimeout: '72h',
      ...tokenFields,
    });
    expect(setInput).toHaveBeenCalledWith({
      message: 'Please respond',
      ...tokenFields,
    });
  });
});

describe('invalidateHitlExternalResumeTokenIfPresent', () => {
  it('clears the token from step state and leaves input unchanged', () => {
    const setInput = jest.fn();
    const setCurrentStepState = jest.fn();
    const stepExecutionRuntime = {
      getCurrentStepState: jest.fn().mockReturnValue({
        dynamicTimeout: '1h',
        [HITL_TOKEN_HASH_INPUT_FIELD]: 'hash',
        [HITL_TOKEN_EXPIRES_AT_INPUT_FIELD]: '2999-01-01T00:00:00.000Z',
      }),
      getCurrentStepResult: jest.fn().mockReturnValue({ input: { message: 'Please respond' } }),
      setCurrentStepState,
      setInput,
    } as unknown as StepExecutionRuntime;

    invalidateHitlExternalResumeTokenIfPresent(stepExecutionRuntime);

    expect(setCurrentStepState).toHaveBeenCalledWith({
      dynamicTimeout: '1h',
      [HITL_TOKEN_HASH_INPUT_FIELD]: null,
      [HITL_TOKEN_EXPIRES_AT_INPUT_FIELD]: null,
    });
    expect(setInput).not.toHaveBeenCalled();
  });

  it('nulls a legacy token stored on the step input', () => {
    const setInput = jest.fn();
    const setCurrentStepState = jest.fn();
    const stepExecutionRuntime = {
      getCurrentStepState: jest.fn().mockReturnValue({ dynamicTimeout: '1h' }),
      getCurrentStepResult: jest.fn().mockReturnValue({
        input: {
          message: 'Please respond',
          [HITL_TOKEN_HASH_INPUT_FIELD]: 'hash',
          [HITL_TOKEN_EXPIRES_AT_INPUT_FIELD]: '2999-01-01T00:00:00.000Z',
        },
      }),
      setCurrentStepState,
      setInput,
    } as unknown as StepExecutionRuntime;

    invalidateHitlExternalResumeTokenIfPresent(stepExecutionRuntime);

    expect(setCurrentStepState).not.toHaveBeenCalled();
    expect(setInput).toHaveBeenCalledWith({
      message: 'Please respond',
      [HITL_TOKEN_HASH_INPUT_FIELD]: null,
      [HITL_TOKEN_EXPIRES_AT_INPUT_FIELD]: null,
    });
  });

  it('does nothing when token metadata is absent', () => {
    const setInput = jest.fn();
    const setCurrentStepState = jest.fn();
    const stepExecutionRuntime = {
      getCurrentStepState: jest.fn().mockReturnValue({ dynamicTimeout: '1h' }),
      getCurrentStepResult: jest.fn().mockReturnValue({ input: { message: 'Please respond' } }),
      setCurrentStepState,
      setInput,
    } as unknown as StepExecutionRuntime;

    invalidateHitlExternalResumeTokenIfPresent(stepExecutionRuntime);

    expect(setInput).not.toHaveBeenCalled();
    expect(setCurrentStepState).not.toHaveBeenCalled();
  });

  it('clears both copies when state and input hold the token', () => {
    const setInput = jest.fn();
    const setCurrentStepState = jest.fn();
    const tokenFields = {
      [HITL_TOKEN_HASH_INPUT_FIELD]: 'hash',
      [HITL_TOKEN_EXPIRES_AT_INPUT_FIELD]: '2999-01-01T00:00:00.000Z',
    };
    const stepExecutionRuntime = {
      getCurrentStepState: jest.fn().mockReturnValue({ dynamicTimeout: '1h', ...tokenFields }),
      getCurrentStepResult: jest
        .fn()
        .mockReturnValue({ input: { message: 'Please respond', ...tokenFields } }),
      setCurrentStepState,
      setInput,
    } as unknown as StepExecutionRuntime;

    invalidateHitlExternalResumeTokenIfPresent(stepExecutionRuntime);

    expect(setCurrentStepState).toHaveBeenCalledWith({
      dynamicTimeout: '1h',
      [HITL_TOKEN_HASH_INPUT_FIELD]: null,
      [HITL_TOKEN_EXPIRES_AT_INPUT_FIELD]: null,
    });
    expect(setInput).toHaveBeenCalledWith({
      message: 'Please respond',
      [HITL_TOKEN_HASH_INPUT_FIELD]: null,
      [HITL_TOKEN_EXPIRES_AT_INPUT_FIELD]: null,
    });
  });
});
