/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import { ExecutionError } from '@kbn/workflows/server';
import type { ApplyStepResultOutput } from '../helpers/apply_step_result';
import { enterWaitingForInput } from '../helpers/enter_waiting_for_input';

export type HandleStepResultOutcome = 'failed' | 'finished' | 'unexpected_kind' | 'waiting';

export interface HandleStepResultDeps {
  failStep: (error: ExecutionError) => void;
  finishStep: (output?: unknown) => void;
  setCurrentStepState: (state: Record<string, unknown>) => void;
  setInput: (input: Record<string, unknown>) => void;
  tryEnterWaitUntil: (deadline: undefined, status: ExecutionStatus) => void;
}

export interface HandleStepResultLogger {
  debug: (message: string) => void;
  error: (message: string) => void;
}

/**
 * Dispatches a resolved ApplyStepResultOutput to the appropriate runtime side-effects.
 *
 * Returns 'waiting' when the caller must return immediately (step is pausing for input).
 * Returns 'failed' or 'finished' when the caller should navigate to the next node.
 * Returns 'unexpected_kind' and logs an error for any unrecognized kind (defensive default).
 */
export const handleStepResult = (
  deps: HandleStepResultDeps,
  logger: HandleStepResultLogger,
  stepResult: ApplyStepResultOutput
): HandleStepResultOutcome => {
  switch (stepResult.kind) {
    case 'waiting': {
      const { stepInput, stepState } = enterWaitingForInput(stepResult.payload);
      deps.setCurrentStepState(stepState);
      deps.setInput(stepInput);
      deps.tryEnterWaitUntil(undefined, ExecutionStatus.WAITING_FOR_INPUT);
      logger.debug(
        `[hitl-debug][wf] waitForInput.enter schemaPresent=${
          stepInput.schema !== undefined
        } messagePresent=${stepInput.message !== undefined}`
      );
      return 'waiting';
    }
    case 'failed': {
      deps.failStep(ExecutionError.fromError(stepResult.payload.error));
      return 'failed';
    }
    case 'finished': {
      deps.finishStep(stepResult.payload.output);
      return 'finished';
    }
    default: {
      const _exhaustive: never = stepResult;
      logger.error(
        `[handleStepResult] Unexpected step result kind: ${String(
          (_exhaustive as unknown as { kind: string }).kind
        )}`
      );
      return 'unexpected_kind';
    }
  }
};
