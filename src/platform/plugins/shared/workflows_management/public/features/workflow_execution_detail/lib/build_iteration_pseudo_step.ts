/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type {
  WorkflowExecutionDto,
  WorkflowStepExecutionDto,
  WorkflowTokenUsage,
} from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import { worstStatus } from './derive_iteration_status';
import { isNotRunStatus } from './get_failed_step_position';
import { normalizeStepAi } from './normalize_step_ai';
import { rollupTokenUsage, tokenRollupToUsage } from './token_rollup';

const ITERATION_ID_RE = /^(foreach|while)-iteration:(.+):(\d+)$/;

export const isIterationPseudoStepId = (id: string | null | undefined): boolean =>
  Boolean(id && ITERATION_ID_RE.test(id));

export const buildIterationVirtualId = (
  stepType: 'foreach-iteration' | 'while-iteration',
  parentStepId: string,
  iterationIndex: number
): string => `${stepType}:${parentStepId}:${iterationIndex}`;

export const parseIterationVirtualId = (
  id: string
): {
  stepType: 'foreach-iteration' | 'while-iteration';
  parentStepId: string;
  iterationIndex: number;
} | null => {
  const match = id.match(ITERATION_ID_RE);
  if (!match) {
    return null;
  }
  return {
    stepType: `${match[1]}-iteration` as 'foreach-iteration' | 'while-iteration',
    parentStepId: match[2],
    iterationIndex: parseInt(match[3], 10),
  };
};

const formatIterationLabel = (n: number): string =>
  i18n.translate('workflows.WorkflowStepExecutionTree.iterationLabel', {
    defaultMessage: 'Iteration #{n}',
    values: { n },
  });

export const resolveForeachItem = (
  foreachStep: WorkflowStepExecutionDto | undefined,
  iterationIndex: number
): unknown => {
  const state = foreachStep?.state as
    | { items?: unknown[]; item?: unknown; index?: number }
    | undefined;
  if (!state) {
    return undefined;
  }
  if (Array.isArray(state.items) && iterationIndex >= 0 && iterationIndex < state.items.length) {
    return state.items[iterationIndex];
  }
  if (state.index === iterationIndex && state.item !== undefined) {
    return state.item;
  }
  return undefined;
};

const stepsInIteration = (
  workflowExecution: WorkflowExecutionDto,
  parentStepId: string,
  iterationIndex: number
): WorkflowStepExecutionDto[] => {
  const indexStr = String(iterationIndex);
  return workflowExecution.stepExecutions.filter((step) => {
    const frame = step.scopeStack?.find((f) => f.stepId === parentStepId);
    if (!frame) {
      return false;
    }
    return frame.nestedScopes.some((scope) => scope.scopeId === indexStr);
  });
};

/**
 * Synthetic step DTO for the iteration subflyout: header label, Input =
 * foreach.item when available, rolled duration/usage; no Output.
 */
export const buildIterationPseudoStep = (
  selectedId: string,
  workflowExecution: WorkflowExecutionDto
): WorkflowStepExecutionDto | null => {
  const parsed = parseIterationVirtualId(selectedId);
  if (!parsed) {
    return null;
  }

  const { stepType, parentStepId, iterationIndex } = parsed;
  const parentType = stepType === 'while-iteration' ? 'while' : 'foreach';
  const parentStep = workflowExecution.stepExecutions.find(
    (step) => step.stepId === parentStepId && step.stepType === parentType
  );

  const children = stepsInIteration(workflowExecution, parentStepId, iterationIndex);
  const childStatuses = children
    .map((step) => step.status)
    .filter((status): status is ExecutionStatus => status != null);
  const executed = childStatuses.filter((status) => !isNotRunStatus(status));
  const status = executed.length === 0 ? ExecutionStatus.SKIPPED : worstStatus(executed);

  const executionTimeMs = children.reduce((sum, step) => {
    if (step.executionTimeMs != null && Number.isFinite(step.executionTimeMs)) {
      return sum + step.executionTimeMs;
    }
    return sum;
  }, 0);

  const rollup = rollupTokenUsage({
    children: children.map((step) => ({
      ai: normalizeStepAi({ usage: step.usage, output: step.output }) ?? undefined,
    })),
  });
  const usage: WorkflowTokenUsage | undefined = tokenRollupToUsage(rollup);

  const item = resolveForeachItem(parentStep, iterationIndex);

  return {
    id: selectedId,
    stepId: formatIterationLabel(iterationIndex),
    stepType,
    status,
    input: item as WorkflowStepExecutionDto['input'],
    output: undefined,
    error: null,
    usage,
    executionTimeMs: executionTimeMs > 0 ? executionTimeMs : null,
    scopeStack: [],
    workflowRunId: workflowExecution.id,
    workflowId: workflowExecution.workflowId ?? '',
    startedAt: '',
    globalExecutionIndex: -1,
    stepExecutionIndex: iterationIndex,
    topologicalIndex: -1,
  } as WorkflowStepExecutionDto;
};
