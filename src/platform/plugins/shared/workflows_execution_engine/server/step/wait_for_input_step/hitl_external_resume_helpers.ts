/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { randomBytes } from 'node:crypto';
import {
  HITL_TOKEN_EXPIRES_AT_INPUT_FIELD,
  HITL_TOKEN_HASH_INPUT_FIELD,
  readHitlExternalResumeToken,
} from '@kbn/workflows';
import { computeTokenHmac } from '@kbn/workflows/server';
import { computeHitlWaitDeadlineMs } from './hitl_timeout_helpers';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';

interface HitlExternalResumeToken {
  token: string;
  tokenHash: string;
  expiresAt: string;
}

export function mintHitlExternalResumeToken({
  stepExecutionRuntime,
  execution,
  timeout,
}: {
  stepExecutionRuntime: StepExecutionRuntime;
  execution: ReturnType<WorkflowExecutionRuntimeManager['getWorkflowExecution']>;
  timeout: string;
}): HitlExternalResumeToken {
  const deadlineMs = computeHitlWaitDeadlineMs(
    stepExecutionRuntime.stepExecution?.startedAt,
    timeout
  );
  if (deadlineMs === undefined) {
    throw new Error('HITL resume token requires a started wait');
  }

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(deadlineMs).toISOString();
  return {
    token,
    tokenHash: computeTokenHmac(
      token,
      execution.id,
      stepExecutionRuntime.stepExecutionId,
      expiresAt
    ),
    expiresAt,
  };
}

/**
 * Writes the resume token onto step state and onto step input.
 * State is what this version reads. Input is what a 9.6 node reads during a rolling upgrade.
 * An Elasticsearch doc merge drops a nested field only when the update sets it to null,
 * so invalidation uses null rather than omitting the key.
 */
export function persistHitlExternalResumeToken(
  stepExecutionRuntime: StepExecutionRuntime,
  token: { tokenHash: string; expiresAt: string },
  stepInput: Record<string, unknown>
): void {
  const state = stepExecutionRuntime.getCurrentStepState() ?? {};
  const tokenFields = {
    [HITL_TOKEN_HASH_INPUT_FIELD]: token.tokenHash,
    [HITL_TOKEN_EXPIRES_AT_INPUT_FIELD]: token.expiresAt,
  };
  stepExecutionRuntime.setCurrentStepState({
    ...state,
    ...tokenFields,
  });
  stepExecutionRuntime.setInput({
    ...stepInput,
    ...tokenFields,
  });
}

/**
 * Nulls legacy token fields on a step input. A partial document update keeps omitted keys.
 */
export function removeHitlExternalResumeTokenFields(
  input: Record<string, unknown>
): Record<string, unknown> {
  return {
    ...input,
    [HITL_TOKEN_HASH_INPUT_FIELD]: null,
    [HITL_TOKEN_EXPIRES_AT_INPUT_FIELD]: null,
  };
}

const readStepInput = (stepExecutionRuntime: StepExecutionRuntime): unknown =>
  stepExecutionRuntime.getCurrentStepResult()?.input;

export function invalidateHitlExternalResumeTokenIfPresent(
  stepExecutionRuntime: StepExecutionRuntime
): void {
  const state = stepExecutionRuntime.getCurrentStepState() ?? {};
  if (readHitlExternalResumeToken({ state })) {
    stepExecutionRuntime.setCurrentStepState({
      ...state,
      [HITL_TOKEN_HASH_INPUT_FIELD]: null,
      [HITL_TOKEN_EXPIRES_AT_INPUT_FIELD]: null,
    });
  }

  const stepInput = readStepInput(stepExecutionRuntime);
  if (stepInput == null || typeof stepInput !== 'object' || Array.isArray(stepInput)) {
    return;
  }
  const input = stepInput as Record<string, unknown>;
  if (!readHitlExternalResumeToken({ input })) {
    return;
  }
  stepExecutionRuntime.setInput(removeHitlExternalResumeTokenFields(input));
}
