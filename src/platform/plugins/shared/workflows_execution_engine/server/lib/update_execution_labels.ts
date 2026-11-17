/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ExecutionLabelNamespaces,
  ExecutionLabels,
  ExecutionLabelsInput,
} from '@kbn/workflows';
import {
  assertExecutionLabelsOwnedBy,
  ExecutionLabelsError,
  mergeExecutionLabels,
  normalizeExecutionLabels,
} from '@kbn/workflows';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';

export const UPDATE_EXECUTION_LABELS_MAX_ATTEMPTS = 5;

export interface UpdateExecutionLabelsParams {
  executionId: string;
  spaceId: string;
  workflowId: string;
  /** Plugin id that owns every label namespace in `labels`. */
  labelOwnerId: string;
  labels: ExecutionLabelsInput;
  /** Keys that may be rewritten with the same value but never changed once set. */
  immutableKeys?: readonly string[];
}

export type UpdateExecutionLabels = (
  params: UpdateExecutionLabelsParams
) => Promise<ExecutionLabels>;

/**
 * Merges labels onto an existing execution, including a completed one, with optimistic
 * concurrency. The execution must match the expected space and workflow; labels are validated and
 * owner-checked before any read. Keys are never deleted. Throws when the revision keeps
 * conflicting so a partial write is never reported as success.
 */
export const updateExecutionLabels = async (
  deps: {
    repository: Pick<
      WorkflowExecutionRepository,
      'getWorkflowExecutionWithVersion' | 'tryUpdateWorkflowExecutionWithVersion'
    >;
    namespaces: ExecutionLabelNamespaces;
  },
  params: UpdateExecutionLabelsParams
): Promise<ExecutionLabels> => {
  const { executionId, spaceId, workflowId, labelOwnerId, immutableKeys = [] } = params;
  const update = normalizeExecutionLabels(params.labels);
  assertExecutionLabelsOwnedBy(update, labelOwnerId, deps.namespaces);
  const immutable = new Set(immutableKeys);

  for (let attempt = 0; attempt < UPDATE_EXECUTION_LABELS_MAX_ATTEMPTS; attempt++) {
    const current = await deps.repository.getWorkflowExecutionWithVersion(executionId, spaceId);
    if (!current || current.execution.workflowId !== workflowId) {
      // The same answer for a missing, cross-space or wrong-workflow execution.
      throw new ExecutionLabelsError(`Workflow execution ${executionId} was not found`);
    }
    const merged = mergeExecutionLabels(current.execution.labels, update, immutable);
    const { seqNo, primaryTerm } = current;
    const applied = await deps.repository.tryUpdateWorkflowExecutionWithVersion(
      { id: executionId, labels: merged },
      { seqNo, primaryTerm }
    );
    if (applied) {
      return merged;
    }
  }
  throw new ExecutionLabelsError(
    `Workflow execution ${executionId} labels changed concurrently; update was not applied`
  );
};
