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
  removeHitlExternalResumeTokenFields,
} from './hitl_external_resume_helpers';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';

describe('mintHitlExternalResumeToken', () => {
  it('converts workflow timeout to a token expiration timestamp', () => {
    jest.useFakeTimers();
    try {
      jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

      const result = mintHitlExternalResumeToken({
        stepExecutionRuntime: { stepExecutionId: 'step-exec-1' } as StepExecutionRuntime,
        execution: { id: 'execution-id', workflowId: 'workflow-id' } as Parameters<
          typeof mintHitlExternalResumeToken
        >[0]['execution'],
        timeout: '2w',
      });

      expect(result.token).toHaveLength(64);
      expect(result.tokenHash).toHaveLength(64);
      expect(result.expiresAt).toBe('2026-01-15T00:00:00.000Z');
    } finally {
      jest.useRealTimers();
    }
  });

  it('produces an HMAC that binds executionId, stepExecutionId, and expiresAt', () => {
    jest.useFakeTimers();
    try {
      jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

      const result = mintHitlExternalResumeToken({
        stepExecutionRuntime: { stepExecutionId: 'step-exec-1' } as StepExecutionRuntime,
        execution: { id: 'exec-1', workflowId: 'wf-1' } as Parameters<
          typeof mintHitlExternalResumeToken
        >[0]['execution'],
        timeout: '1h',
      });

      const expectedHmac = computeTokenHmac(
        result.token,
        'exec-1',
        'step-exec-1',
        result.expiresAt
      );
      expect(result.tokenHash).toBe(expectedHmac);
    } finally {
      jest.useRealTimers();
    }
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
  it('removes token metadata while preserving user input fields', () => {
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
    });
  });
});

describe('invalidateHitlExternalResumeTokenIfPresent', () => {
  it('clears token metadata from the current step input', () => {
    const setInput = jest.fn();
    const stepExecutionRuntime = {
      stepExecution: {
        input: {
          message: 'Please respond',
          [HITL_TOKEN_HASH_INPUT_FIELD]: 'hash',
          [HITL_TOKEN_EXPIRES_AT_INPUT_FIELD]: '2999-01-01T00:00:00.000Z',
        },
      },
      setInput,
    } as unknown as StepExecutionRuntime;

    invalidateHitlExternalResumeTokenIfPresent(stepExecutionRuntime);

    expect(setInput).toHaveBeenCalledWith({ message: 'Please respond' });
  });

  it('does nothing when token metadata is absent', () => {
    const setInput = jest.fn();
    const stepExecutionRuntime = {
      stepExecution: { input: { message: 'Please respond' } },
      setInput,
    } as unknown as StepExecutionRuntime;

    invalidateHitlExternalResumeTokenIfPresent(stepExecutionRuntime);

    expect(setInput).not.toHaveBeenCalled();
  });
});
