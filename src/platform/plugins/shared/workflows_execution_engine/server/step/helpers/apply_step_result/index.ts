/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StepHandlerResult } from '@kbn/workflows-extensions/server';

interface StepResultWaiting {
  kind: 'waiting';
  payload: NonNullable<StepHandlerResult['waitingForInput']>;
}

interface StepResultFailed {
  kind: 'failed';
  payload: { error: Error };
}

interface StepResultFinished {
  kind: 'finished';
  payload: { output?: unknown };
}

export type ApplyStepResultOutput = StepResultWaiting | StepResultFailed | StepResultFinished;

/**
 * Pure: dispatches a StepHandlerResult to one of three terminal outcomes.
 *
 * - 'waiting'  — handler signalled WAITING_FOR_INPUT on the initial (non-resume) run
 * - 'failed'   — handler returned an error
 * - 'finished' — handler completed successfully (or resume run ignores waitingForInput)
 */
export const applyStepResult = (
  result: StepHandlerResult,
  isResuming: boolean
): ApplyStepResultOutput => {
  if (!isResuming && result.waitingForInput) {
    return { kind: 'waiting', payload: result.waitingForInput };
  }

  if (result.error) {
    return { kind: 'failed', payload: { error: result.error } };
  }

  return { kind: 'finished', payload: { output: result.output } };
};
