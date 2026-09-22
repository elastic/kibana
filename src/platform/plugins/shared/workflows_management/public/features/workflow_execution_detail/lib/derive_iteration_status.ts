/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';
import { isNotRunStatus } from './get_failed_step_position';

/** Minimal tree shape needed to derive iteration status from descendants. */
export interface IterationStatusTreeItem {
  stepId: string;
  stepType: string;
  status: ExecutionStatus | null;
  stepExecutionId: string | null;
  children: IterationStatusTreeItem[];
}

const isIterationStepType = (stepType: string | undefined): boolean =>
  stepType === 'foreach-iteration' || stepType === 'while-iteration';

/** Higher rank = worse / more urgent for parent rollup. */
const STATUS_RANK: Record<ExecutionStatus, number> = {
  [ExecutionStatus.FAILED]: 100,
  [ExecutionStatus.TIMED_OUT]: 95,
  [ExecutionStatus.CANCELLED]: 90,
  [ExecutionStatus.WAITING_FOR_INPUT]: 70,
  [ExecutionStatus.WAITING_FOR_CHILD]: 65,
  [ExecutionStatus.WAITING]: 60,
  [ExecutionStatus.RUNNING]: 50,
  [ExecutionStatus.QUEUED]: 40,
  [ExecutionStatus.PENDING]: 30,
  [ExecutionStatus.COMPLETED]: 20,
  [ExecutionStatus.SKIPPED]: 10,
};

export const worstStatus = (statuses: ExecutionStatus[]): ExecutionStatus => {
  if (statuses.length === 0) {
    return ExecutionStatus.SKIPPED;
  }
  return statuses.reduce((worst, current) =>
    STATUS_RANK[current] > STATUS_RANK[worst] ? current : worst
  );
};

const collectLeafStatuses = (
  item: IterationStatusTreeItem,
  stepExecutionMap: Map<string, WorkflowStepExecutionDto>,
  into: ExecutionStatus[]
): void => {
  for (const child of item.children) {
    if (isIterationStepType(child.stepType)) {
      collectLeafStatuses(child, stepExecutionMap, into);
    } else {
      const exec = stepExecutionMap.get(child.stepExecutionId ?? '');
      const status = exec?.status ?? child.status;
      if (status != null) {
        into.push(status);
      }
      if (child.children.length > 0) {
        collectLeafStatuses(child, stepExecutionMap, into);
      }
    }
  }
};

/**
 * Iteration nodes are synthetic — never use the leaf SKIPPED fallback.
 * Status is the worst executed descendant; SKIPPED ("Not run") only when
 * there are zero executed (non-pending/skipped) descendant steps.
 */
export const deriveIterationStatus = (
  item: IterationStatusTreeItem,
  stepExecutionMap: Map<string, WorkflowStepExecutionDto>
): ExecutionStatus => {
  const leafStatuses: ExecutionStatus[] = [];
  collectLeafStatuses(item, stepExecutionMap, leafStatuses);

  const executed = leafStatuses.filter((status) => !isNotRunStatus(status));
  if (executed.length === 0) {
    return ExecutionStatus.SKIPPED;
  }
  return worstStatus(executed);
};

/**
 * Not-run iterations may only appear as a trailing contiguous block after
 * the last executed iteration. Earlier holes are coerced away from not-run.
 */
export const applyTrailingNotRunConstraint = (statuses: ExecutionStatus[]): ExecutionStatus[] => {
  let lastExecutedIndex = -1;
  for (let i = 0; i < statuses.length; i++) {
    if (!isNotRunStatus(statuses[i])) {
      lastExecutedIndex = i;
    }
  }

  return statuses.map((status, index) => {
    if (isNotRunStatus(status) && index <= lastExecutedIndex) {
      return ExecutionStatus.COMPLETED;
    }
    return status;
  });
};

/**
 * Derive per-index iteration statuses for foreach/while children and enforce
 * the trailing not-run rule across siblings.
 */
export const buildIterationStatusOverrides = (
  children: IterationStatusTreeItem[],
  stepExecutionMap: Map<string, WorkflowStepExecutionDto>
): Map<number, ExecutionStatus> => {
  const derivedByIndex = new Map<number, ExecutionStatus>();
  for (const child of children) {
    if (isIterationStepType(child.stepType)) {
      const index = parseInt(child.stepId, 10);
      if (!Number.isNaN(index)) {
        derivedByIndex.set(index, deriveIterationStatus(child, stepExecutionMap));
      }
    }
  }

  const sortedIndices = [...derivedByIndex.keys()].sort((a, b) => a - b);
  const constrained = applyTrailingNotRunConstraint(
    sortedIndices.map((index) => derivedByIndex.get(index) ?? ExecutionStatus.SKIPPED)
  );

  return new Map(sortedIndices.map((index, i) => [index, constrained[i]]));
};
