/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getStepByNameFromNestedSteps } from '@kbn/workflows';
import type { SerializedError, WorkflowStepExecutionDto, WorkflowYaml } from '@kbn/workflows';

export interface DiagnosisAttemptHistoryEntry {
  attemptNumber: number;
  status: string;
  durationMs?: number;
  error?: SerializedError | string | null;
}

/**
 * Context attached to the Agent Builder chat for failure diagnosis (states A/B).
 */
export interface DiagnosisContextPackage {
  error: SerializedError | string;
  /** Resolved step input (post-templating). */
  stepInput: unknown;
  /** Step definition from the workflow YAML (object form). */
  stepYaml: unknown;
  /** Present only when the step ran under retry scopes / multiple attempts. */
  attemptHistory?: DiagnosisAttemptHistoryEntry[];
  workflowId: string;
  executionId: string;
  stepId: string;
}

export interface BuildDiagnosisContextPackageInput {
  failedStep: WorkflowStepExecutionDto;
  allStepExecutions: WorkflowStepExecutionDto[];
  definition?: WorkflowYaml | null;
  workflowId: string;
  executionId: string;
}

const hasEnterRetryScope = (step: WorkflowStepExecutionDto): boolean =>
  (step.scopeStack ?? []).some((frame) =>
    frame.nestedScopes.some((scope) => scope.nodeType === 'enter-retry')
  );

const attemptNumberFromScope = (step: WorkflowStepExecutionDto): number => {
  for (const frame of step.scopeStack ?? []) {
    for (const scope of frame.nestedScopes) {
      if (scope.nodeType === 'enter-retry' && scope.scopeId) {
        const match = /^(\d+)-attempt$/.exec(scope.scopeId);
        if (match) {
          return Number(match[1]);
        }
      }
    }
  }
  return step.stepExecutionIndex != null ? step.stepExecutionIndex + 1 : 1;
};

/**
 * Assemble the AI Agent diagnosis handoff package. Pure — safe to unit test.
 */
export const buildDiagnosisContextPackage = ({
  failedStep,
  allStepExecutions,
  definition,
  workflowId,
  executionId,
}: BuildDiagnosisContextPackageInput): DiagnosisContextPackage => {
  const stepId = failedStep.stepId;
  const stepDef =
    definition?.steps != null ? getStepByNameFromNestedSteps(definition.steps, stepId) : null;

  const siblingAttempts = allStepExecutions
    .filter((s) => s.stepId === stepId && hasEnterRetryScope(s))
    .sort(
      (a, b) =>
        (a.globalExecutionIndex ?? 0) - (b.globalExecutionIndex ?? 0) ||
        (a.stepExecutionIndex ?? 0) - (b.stepExecutionIndex ?? 0)
    );

  const attemptHistory =
    siblingAttempts.length > 0
      ? siblingAttempts.map(
          (s): DiagnosisAttemptHistoryEntry => ({
            attemptNumber: attemptNumberFromScope(s),
            status: String(s.status ?? ''),
            durationMs: s.executionTimeMs,
            error: s.error ?? null,
          })
        )
      : undefined;

  return {
    error: failedStep.error ?? { type: 'Error', message: 'Unknown error' },
    stepInput: failedStep.input ?? null,
    stepYaml: stepDef ?? null,
    ...(attemptHistory != null ? { attemptHistory } : {}),
    workflowId,
    executionId,
    stepId,
  };
};
