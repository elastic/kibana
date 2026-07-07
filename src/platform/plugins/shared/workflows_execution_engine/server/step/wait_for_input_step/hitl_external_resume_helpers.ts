/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { randomBytes } from 'node:crypto';
import { HITL_TOKEN_EXPIRES_AT_INPUT_FIELD, HITL_TOKEN_HASH_INPUT_FIELD } from '@kbn/workflows';
import { computeTokenHmac } from '@kbn/workflows/server';
import { parseDuration } from '../../utils';
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
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + parseDuration(timeout)).toISOString();
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

export function removeHitlExternalResumeTokenFields(
  input: Record<string, unknown>
): Record<string, unknown> {
  const nextInput = { ...input };
  delete nextInput[HITL_TOKEN_HASH_INPUT_FIELD];
  delete nextInput[HITL_TOKEN_EXPIRES_AT_INPUT_FIELD];
  return nextInput;
}

export function invalidateHitlExternalResumeTokenIfPresent(
  stepExecutionRuntime: StepExecutionRuntime
): void {
  const stepInput =
    stepExecutionRuntime.stepExecution?.input ??
    (typeof stepExecutionRuntime.getCurrentStepResult === 'function'
      ? stepExecutionRuntime.getCurrentStepResult()?.input
      : undefined);

  if (stepInput == null || typeof stepInput !== 'object') {
    return;
  }

  const input = stepInput as Record<string, unknown>;
  if (!(HITL_TOKEN_HASH_INPUT_FIELD in input) && !(HITL_TOKEN_EXPIRES_AT_INPUT_FIELD in input)) {
    return;
  }

  stepExecutionRuntime.setInput(removeHitlExternalResumeTokenFields(input));
}
