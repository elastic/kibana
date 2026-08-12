/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus, isDangerousStatus } from '@kbn/workflows';
import type { WorkflowExecutionDto, WorkflowStepExecutionDto } from '@kbn/workflows';

export interface FailedStepPosition {
  /** First failed top-level step, when numbering is unambiguous. */
  step: WorkflowStepExecutionDto;
  /** 1-based index among top-level (non-nested) steps. */
  index: number;
  /** Total top-level steps counted for "N of M". */
  total: number;
}

const isTopLevelStep = (step: WorkflowStepExecutionDto): boolean =>
  (step.scopeStack?.length ?? 0) === 0 &&
  step.stepType !== '__overview' &&
  step.stepType !== '__trigger' &&
  step.stepType !== '__inputs' &&
  !(step.stepType?.startsWith('trigger_') ?? false) &&
  step.stepType !== 'if-branch' &&
  step.stepType !== 'enter-case-branch' &&
  step.stepType !== 'enter-default-branch' &&
  step.stepType !== 'foreach-iteration' &&
  step.stepType !== 'while-iteration' &&
  step.stepType !== 'parallel-branch';

/**
 * Find the first failed top-level step for the Result stat.
 * Returns null when numbering would be ambiguous (e.g. failure only inside nested branch).
 */
export const getFailedStepPosition = (
  execution: WorkflowExecutionDto | null | undefined
): FailedStepPosition | null => {
  if (!execution || !isDangerousStatus(execution.status)) {
    return null;
  }

  const topLevel = execution.stepExecutions.filter(isTopLevelStep);
  if (topLevel.length === 0) {
    return null;
  }

  const failedIndex = topLevel.findIndex(
    (s) => s.status != null && isDangerousStatus(s.status)
  );
  if (failedIndex === -1) {
    // Failure exists at execution level but not as a top-level step — ambiguous.
    return null;
  }

  return {
    step: topLevel[failedIndex],
    index: failedIndex + 1,
    total: topLevel.length,
  };
};

export const isNotRunStatus = (status?: ExecutionStatus | null): boolean =>
  status === ExecutionStatus.PENDING || status === ExecutionStatus.SKIPPED;
