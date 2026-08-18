/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus, isDangerousStatus } from '@kbn/workflows';
import type {
  WorkflowExecutionDto,
  WorkflowStepExecutionDto,
  WorkflowYaml,
} from '@kbn/workflows';

export interface FailedStepPosition {
  /** Failed step to open / scroll to (may be nested). */
  step: WorkflowStepExecutionDto;
  /**
   * 1-based index among definition top-level steps when numbering is unambiguous.
   * Omitted for nested-only failures (Result reads plain "Failed").
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

/** Scopes that mean the failure sits inside control-flow nesting (not plain retry). */
const CONTROL_FLOW_SCOPE_TYPES = new Set([
  'foreach',
  'enter-foreach',
  'while',
  'enter-while',
  'if',
  'enter-condition',
  'switch',
  'enter-switch',
  'parallel',
  'enter-parallel',
]);

const scopeHasControlFlowNesting = (step: WorkflowStepExecutionDto): boolean =>
  (step.scopeStack ?? []).some((frame) =>
    frame.nestedScopes.some((scope) => CONTROL_FLOW_SCOPE_TYPES.has(scope.nodeType ?? ''))
  );

/**
 * Owning top-level definition step name for a failed execution record.
 * Retry scopes still belong to that step; control-flow nesting is ambiguous for numbering.
 */
const owningTopLevelStepId = (step: WorkflowStepExecutionDto): string | undefined => {
  if (!step.scopeStack?.length) {
    return step.stepId;
  }
  if (scopeHasControlFlowNesting(step)) {
    return undefined;
  }
  // Retry-only (or other non-control-flow) scopes: outermost frame is the step.
  return step.scopeStack[0]?.stepId ?? step.stepId;
};

/**
 * Find the failed step for the Result stat. When a failure maps cleanly to a
 * definition top-level step (no control-flow nesting), include 1-based
 * `{index, total}`; otherwise omit them so the UI shows plain "Failed".
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

  // Number from the earliest unambiguous top-level owner among dangerous steps.
  const numbered = [...dangerous]
    .map((s) => ({ step: s, owner: owningTopLevelStepId(s) }))
    .filter(
      (entry): entry is { step: WorkflowStepExecutionDto; owner: string } =>
        entry.owner != null && definitionSteps.some((d) => d.name === entry.owner)
    )
    .sort(
      (a, b) =>
        (a.step.globalExecutionIndex ?? 0) - (b.step.globalExecutionIndex ?? 0) ||
        (a.step.stepExecutionIndex ?? 0) - (b.step.stepExecutionIndex ?? 0)
    );

  if (numbered.length === 0) {
    return { step: failedStep };
  }

  const ownerName = numbered[0].owner;
  const defIndex = definitionSteps.findIndex((s) => s.name === ownerName);
  return {
    step: failedStep,
    index: defIndex + 1,
    total: definitionSteps.length,
  };
};

export const isNotRunStatus = (status?: ExecutionStatus | null): boolean =>
  status === ExecutionStatus.PENDING || status === ExecutionStatus.SKIPPED;
