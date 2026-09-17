/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ChildWorkflowExecutionItem, WorkflowStepExecutionDto } from '@kbn/workflows';
import type { ChildWorkflowExecutionsMap } from './use_child_workflow_executions';

export interface ResolvedSelectedStepExecution {
  lightweightStep: WorkflowStepExecutionDto | undefined;
  /** Execution id to use when fetching full step I/O */
  resolvedExecutionId: string;
  /** Child run linked from a workflow.execute parent step */
  childWorkflowExecution: ChildWorkflowExecutionItem | undefined;
  /** Nested run that owns the selected step (injected child row) */
  parentWorkflowExecution: ChildWorkflowExecutionItem | undefined;
}

/** Resolves a selected step against the parent run or an injected child run. */
export function resolveSelectedStepExecution({
  selectedStepExecutionId,
  parentExecutionId,
  parentStepExecutions,
  childExecutions,
}: {
  selectedStepExecutionId: string | null | undefined;
  parentExecutionId: string;
  parentStepExecutions: WorkflowStepExecutionDto[] | undefined;
  childExecutions: ChildWorkflowExecutionsMap;
}): ResolvedSelectedStepExecution {
  const empty: ResolvedSelectedStepExecution = {
    lightweightStep: undefined,
    resolvedExecutionId: parentExecutionId,
    childWorkflowExecution: undefined,
    parentWorkflowExecution: undefined,
  };

  if (!selectedStepExecutionId) {
    return empty;
  }

  const parentStep = parentStepExecutions?.find((step) => step.id === selectedStepExecutionId);
  if (parentStep) {
    return {
      lightweightStep: parentStep,
      resolvedExecutionId: parentExecutionId,
      childWorkflowExecution: childExecutions.get(selectedStepExecutionId),
      parentWorkflowExecution: undefined,
    };
  }

  for (const childWorkflowExecution of childExecutions.values()) {
    const childStep = childWorkflowExecution.stepExecutions.find(
      (step) => step.id === selectedStepExecutionId
    );
    if (childStep) {
      return {
        lightweightStep: childStep,
        resolvedExecutionId: childWorkflowExecution.executionId,
        childWorkflowExecution: undefined,
        parentWorkflowExecution: childWorkflowExecution,
      };
    }
  }

  return empty;
}
