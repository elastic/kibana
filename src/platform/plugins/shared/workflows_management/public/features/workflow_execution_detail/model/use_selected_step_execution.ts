/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import type {
  ChildWorkflowExecutionItem,
  WorkflowExecutionDto,
  WorkflowStepExecutionDto,
} from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import { resolveSelectedStepExecution } from './resolve_selected_step_execution';
import type { ChildWorkflowExecutionsMap } from './use_child_workflow_executions';
import { useStepExecution } from './use_step_execution';
import {
  buildIterationPseudoStep,
  isIterationPseudoStepId,
} from '../lib/build_iteration_pseudo_step';
import {
  buildOverviewStepExecutionFromContext,
  buildTriggerStepExecutionFromContext,
} from '../ui/workflow_pseudo_step_context';

const buildIfBranchStepExecution = (
  selectedStepExecutionId: string,
  workflowExecution: WorkflowExecutionDto
): WorkflowStepExecutionDto => {
  const branchName = selectedStepExecutionId.split(':')[1];
  return {
    id: selectedStepExecutionId,
    stepId: branchName,
    stepType: 'if-branch',
    status: ExecutionStatus.COMPLETED,
    input: undefined,
    output: { result: branchName } as unknown as WorkflowStepExecutionDto['output'],
    scopeStack: [],
    workflowRunId: workflowExecution.id,
    workflowId: workflowExecution.workflowId ?? '',
    startedAt: '',
    globalExecutionIndex: -1,
    stepExecutionIndex: 0,
    topologicalIndex: -1,
  } as WorkflowStepExecutionDto;
};

const buildEnterCaseBranchStepExecution = (
  selectedStepExecutionId: string,
  workflowExecution: WorkflowExecutionDto
): WorkflowStepExecutionDto => {
  const parts = selectedStepExecutionId.split(':');
  const caseName = parts[1];
  const caseStatus = (parts[3] as ExecutionStatus) ?? ExecutionStatus.COMPLETED;
  return {
    id: selectedStepExecutionId,
    stepId: caseName,
    stepType: 'enter-case-branch',
    status: caseStatus,
    input: undefined,
    output: undefined,
    scopeStack: [],
    workflowRunId: workflowExecution.id,
    workflowId: workflowExecution.workflowId ?? '',
    startedAt: '',
    globalExecutionIndex: -1,
    stepExecutionIndex: 0,
    topologicalIndex: -1,
  } as WorkflowStepExecutionDto;
};

interface UseSelectedStepExecutionParams {
  selectedStepExecutionId: string | null;
  executionId: string;
  workflowExecution: WorkflowExecutionDto | undefined;
  childExecutions: ChildWorkflowExecutionsMap;
}

export interface SelectedStepExecution {
  /** Overview, trigger and branch rows: synthesized in the UI, not stored step executions. */
  isPseudoStep: boolean;
  isIterationPseudoStep: boolean;
  /** Run context shown as Metadata on the trigger row. */
  executionMetadata: ReturnType<typeof buildOverviewStepExecutionFromContext>['input'] | null;
  /** The selected step without its input/output payload. */
  selectedLightStep: WorkflowStepExecutionDto | undefined;
  /** Execution id to use when fetching full step I/O. */
  resolvedExecutionId: string;
  childWorkflowExecution: ChildWorkflowExecutionItem | undefined;
  parentWorkflowExecution: ChildWorkflowExecutionItem | undefined;
  isLoadingStepData: boolean;
  /** The selected step with its payload merged in, or the synthesized pseudo step. */
  activeStepExecution: WorkflowStepExecutionDto | null | undefined;
}

/** Resolves the step selected in the flyout, fetching its full input and output. */
export const useSelectedStepExecution = ({
  selectedStepExecutionId,
  executionId,
  workflowExecution,
  childExecutions,
}: UseSelectedStepExecutionParams): SelectedStepExecution => {
  const isPseudoStep =
    selectedStepExecutionId === '__overview' ||
    selectedStepExecutionId === 'trigger' ||
    (selectedStepExecutionId?.startsWith('if-branch:') ?? false) ||
    (selectedStepExecutionId?.startsWith('enter-case-branch:') ?? false) ||
    isIterationPseudoStepId(selectedStepExecutionId);

  const isIterationPseudoStep = isIterationPseudoStepId(selectedStepExecutionId);

  const pseudoStepExecution = useMemo<WorkflowStepExecutionDto | null>(() => {
    if (!workflowExecution) return null;
    if (selectedStepExecutionId === 'trigger') {
      return buildTriggerStepExecutionFromContext(workflowExecution);
    }
    if (selectedStepExecutionId === '__overview') {
      return buildOverviewStepExecutionFromContext(workflowExecution);
    }
    if (selectedStepExecutionId && isIterationPseudoStepId(selectedStepExecutionId)) {
      return buildIterationPseudoStep(selectedStepExecutionId, workflowExecution);
    }
    if (selectedStepExecutionId?.startsWith('if-branch:')) {
      return buildIfBranchStepExecution(selectedStepExecutionId, workflowExecution);
    }
    if (selectedStepExecutionId?.startsWith('enter-case-branch:')) {
      return buildEnterCaseBranchStepExecution(selectedStepExecutionId, workflowExecution);
    }
    return null;
  }, [selectedStepExecutionId, workflowExecution]);

  const executionMetadata = useMemo(() => {
    if (!workflowExecution || selectedStepExecutionId !== 'trigger') return null;
    return buildOverviewStepExecutionFromContext(workflowExecution).input;
  }, [selectedStepExecutionId, workflowExecution]);

  const {
    lightweightStep: selectedLightStep,
    resolvedExecutionId,
    childWorkflowExecution,
    parentWorkflowExecution,
  } = useMemo(
    () =>
      resolveSelectedStepExecution({
        selectedStepExecutionId: isPseudoStep ? undefined : selectedStepExecutionId,
        parentExecutionId: executionId,
        parentStepExecutions: workflowExecution?.stepExecutions,
        childExecutions,
      }),
    [
      isPseudoStep,
      selectedStepExecutionId,
      executionId,
      workflowExecution?.stepExecutions,
      childExecutions,
    ]
  );

  const { data: fullStepExecution, isLoading: isLoadingStepData } = useStepExecution(
    resolvedExecutionId,
    isPseudoStep ? undefined : selectedStepExecutionId ?? undefined,
    selectedLightStep?.status
  );

  const activeStepExecution = useMemo(() => {
    if (isPseudoStep) {
      return pseudoStepExecution;
    }
    if (selectedLightStep && fullStepExecution) {
      return {
        ...selectedLightStep,
        input: fullStepExecution.input,
        output: fullStepExecution.output,
      };
    }
    return selectedLightStep ?? fullStepExecution ?? pseudoStepExecution;
  }, [isPseudoStep, pseudoStepExecution, selectedLightStep, fullStepExecution]);

  return {
    isPseudoStep,
    isIterationPseudoStep,
    executionMetadata,
    selectedLightStep,
    resolvedExecutionId,
    childWorkflowExecution,
    parentWorkflowExecution,
    isLoadingStepData,
    activeStepExecution,
  };
};
