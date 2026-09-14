/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus, isDangerousStatus } from '@kbn/workflows';
import type { WorkflowExecutionDto, WorkflowStepExecutionDto, WorkflowYaml } from '@kbn/workflows';

export interface FailedStepPosition {
  /** Failed step to open / scroll to (may be nested). */
  step: WorkflowStepExecutionDto;
  /**
   * 1-based index among definition top-level steps when an owning top-level
   * step can be resolved. Omitted when ownership cannot be mapped (Result
   * reads plain "Failed").
   */
  index?: number;
  /** Definition top-level step count; present only with `index`. */
  total?: number;
}

const PSEUDO_OR_BRANCH_TYPES = new Set([
  '__overview',
  '__trigger',
  '__inputs',
  'if-branch',
  'enter-case-branch',
  'enter-default-branch',
  'foreach-iteration',
  'while-iteration',
  'parallel-branch',
]);

const isNumberableStep = (step: WorkflowStepExecutionDto): boolean =>
  !PSEUDO_OR_BRANCH_TYPES.has(step.stepType ?? '') &&
  !(step.stepType?.startsWith('trigger_') ?? false);

/**
 * Owning top-level definition step for a failed execution record.
 *
 * Same ownership rule as the danger border: retry attempts are internal to
 * their step (`stepId` is shared), so a retried top-level failure numbers
 * against that step. When the failed leaf is nested under control flow, the
 * outermost scope frame that matches a definition top-level step is the owner
 * (e.g. the foreach that contains the failure).
 */
const owningTopLevelStepId = (
  step: WorkflowStepExecutionDto,
  topLevelNames: ReadonlySet<string>
): string | undefined => {
  // Attempts / plain top-level failures: stepId is the definition step.
  if (topLevelNames.has(step.stepId)) {
    return step.stepId;
  }

  // Nested leaf (foreach/if/switch/…): walk scopes outermost → innermost.
  for (const frame of step.scopeStack ?? []) {
    if (topLevelNames.has(frame.stepId)) {
      return frame.stepId;
    }
  }

  return undefined;
};

/**
 * Find the failed step for the Result stat. Resolve ownership first, then
 * number `{index, total}` against the definition's top-level steps when the
 * owner maps cleanly; otherwise omit them so the UI shows plain "Failed".
 */
export const getFailedStepPosition = (
  execution: WorkflowExecutionDto | null | undefined,
  definition?: WorkflowYaml | null
): FailedStepPosition | null => {
  if (!execution || !isDangerousStatus(execution.status)) {
    return null;
  }

  const dangerous = execution.stepExecutions.filter(
    (s) => isNumberableStep(s) && s.status != null && isDangerousStatus(s.status)
  );

  if (dangerous.length === 0) {
    return null;
  }

  // Prefer the step that carries the error panel: has error payload, then the
  // latest attempt (retries put the panel on the final attempt, not the first).
  const linkCandidates = [...dangerous].sort((a, b) => {
    const aHasError = a.error != null ? 1 : 0;
    const bHasError = b.error != null ? 1 : 0;
    if (bHasError !== aHasError) {
      return bHasError - aHasError;
    }
    const aDepth = a.scopeStack?.length ?? 0;
    const bDepth = b.scopeStack?.length ?? 0;
    if (bDepth !== aDepth) {
      return bDepth - aDepth;
    }
    return (
      (b.globalExecutionIndex ?? 0) - (a.globalExecutionIndex ?? 0) ||
      (b.stepExecutionIndex ?? 0) - (a.stepExecutionIndex ?? 0)
    );
  });
  const failedStep = linkCandidates[0];

  const definitionSteps = definition?.steps ?? [];
  if (definitionSteps.length === 0) {
    return { step: failedStep };
  }

  const topLevelNames = new Set(definitionSteps.map((s) => s.name));
  const ownerName = owningTopLevelStepId(failedStep, topLevelNames);
  if (ownerName == null) {
    return { step: failedStep };
  }

  const defIndex = definitionSteps.findIndex((s) => s.name === ownerName);
  if (defIndex < 0) {
    return { step: failedStep };
  }

  return {
    step: failedStep,
    index: defIndex + 1,
    total: definitionSteps.length,
  };
};

export const isNotRunStatus = (status?: ExecutionStatus | null): boolean =>
  status === ExecutionStatus.PENDING || status === ExecutionStatus.SKIPPED;
