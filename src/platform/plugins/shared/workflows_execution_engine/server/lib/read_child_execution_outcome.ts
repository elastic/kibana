/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { omit } from 'lodash';
import type { JsonValue } from '@kbn/utility-types';
import type {
  EsWorkflowExecution,
  EsWorkflowStepExecution,
  WorkflowStepExecutionDto,
} from '@kbn/workflows';
import { ExecutionStatus, isTerminalStatus } from '@kbn/workflows';
import { ExecutionError } from '@kbn/workflows/server';
import { deriveExecutionOutput } from './derive_execution_output';
import type { StepExecutionRepository } from '../repositories/step_execution_repository';
import type { IWorkflowEventLogger } from '../workflow_event_logger';

/** What a step that consumed a whole child execution reports back to the workflow. */
export type ChildExecutionOutcome =
  | { status: 'completed'; output?: JsonValue }
  | { status: 'failed'; error: ExecutionError };

interface ReadChildExecutionOutcomeParams {
  execution: EsWorkflowExecution;
  stepExecutionRepository: StepExecutionRepository;
  logger: IWorkflowEventLogger;
}

/**
 * Reduces a terminal child execution to the outcome its calling step reports:
 * either the value the child produced, or the most specific error available for
 * why it did not complete.
 *
 * Shared by every step that runs another execution and waits for it —
 * `workflow.execute` and each branch of a parallel step — so a child failure
 * reads the same way whichever construct spawned it.
 */
export const readChildExecutionOutcome = async ({
  execution,
  stepExecutionRepository,
  logger,
}: ReadChildExecutionOutcomeParams): Promise<ChildExecutionOutcome> => {
  if (execution.status !== ExecutionStatus.COMPLETED) {
    return {
      status: 'failed',
      error: await buildChildFailureError({ execution, stepExecutionRepository, logger }),
    };
  }

  if (execution.context?.output) {
    return { status: 'completed', output: execution.context.output as JsonValue };
  }

  const stepExecutions = await stepExecutionRepository.getStepExecutionsByWorkflowExecution(
    execution.id,
    execution.stepExecutionIds
  );
  const stepExecutionDtos: WorkflowStepExecutionDto[] = stepExecutions.map((stepExecution) =>
    omit(stepExecution, ['spaceId'])
  );
  const output = deriveExecutionOutput(stepExecutionDtos);

  return { status: 'completed', ...(output === null ? {} : { output }) };
};

/**
 * Builds the error reported for a child execution that did not complete,
 * preferring the most specific detail available over a bare status string.
 */
const buildChildFailureError = async ({
  execution,
  stepExecutionRepository,
  logger,
}: ReadChildExecutionOutcomeParams): Promise<ExecutionError> => {
  if (execution.error) {
    return new ExecutionError(execution.error);
  }

  if (execution.cancellationReason) {
    return new ExecutionError({
      type: 'Error',
      message: `Sub-workflow execution ${execution.status}: ${execution.cancellationReason}`,
    });
  }

  const failingStep = await findFailingChildStep({ execution, stepExecutionRepository, logger });
  if (failingStep) {
    const stepType = failingStep.stepType ? ` (${failingStep.stepType})` : '';
    const detail = failingStep.error?.message ? `: ${failingStep.error.message}` : '';
    return new ExecutionError({
      type: 'Error',
      message: `Sub-workflow execution ${execution.status} at step '${failingStep.stepId}'${stepType}${detail}`,
    });
  }

  return new ExecutionError({
    type: 'Error',
    message: `Sub-workflow execution ${execution.status}`,
  });
};

/**
 * Finds the child step most responsible for the failure. On timeout the zone
 * fails the running step with a `TimeoutError` and clears the workflow-level
 * error, so we look for the latest step carrying an error (or still running)
 * rather than a top-level error that is no longer there.
 */
const findFailingChildStep = async ({
  execution,
  stepExecutionRepository,
  logger,
}: ReadChildExecutionOutcomeParams): Promise<EsWorkflowStepExecution | undefined> => {
  try {
    const stepExecutions = await stepExecutionRepository.getStepExecutionsByWorkflowExecution(
      execution.id,
      execution.stepExecutionIds
    );
    const candidates = stepExecutions.filter(
      (step) => step.error != null || !isTerminalStatus(step.status)
    );
    if (candidates.length === 0) {
      return undefined;
    }
    return candidates.reduce((latest, step) =>
      step.globalExecutionIndex > latest.globalExecutionIndex ? step : latest
    );
  } catch (error) {
    // Best-effort: a read failure must not crash the calling step.
    logger.logDebug(
      `Failed to read child step executions for failure enrichment: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return undefined;
  }
};
