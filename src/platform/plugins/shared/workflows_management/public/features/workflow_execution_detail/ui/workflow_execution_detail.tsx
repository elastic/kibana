/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiPanel } from '@elastic/eui';
import React, { useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux-v7';
import useLocalStorage from 'react-use/lib/useLocalStorage';

import { useQueryClient } from '@kbn/react-query';
import {
  ResizableLayout,
  ResizableLayoutDirection,
  ResizableLayoutMode,
  ResizableLayoutOrder,
} from '@kbn/resizable-layout';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';
import { ExecutionStatus, isTerminalStatus } from '@kbn/workflows';
import { WorkflowExecutionPanel } from './workflow_execution_panel';
import {
  buildOverviewStepExecutionFromContext,
  buildTriggerStepExecutionFromContext,
} from './workflow_pseudo_step_context';
import { WorkflowStepExecutionDetails } from './workflow_step_execution_details';
import { useWorkflowExecutionPolling } from '../../../entities/workflows/model/use_workflow_execution_polling';
import { selectStepExecutionsTotal } from '../../../entities/workflows/store/workflow_detail/selectors';
import {
  HIGHLIGHTED_STEP_TRIGGER,
  setHighlightedStepId,
} from '../../../entities/workflows/store/workflow_detail/slice';
import { useWorkflowUrlState } from '../../../hooks/use_workflow_url_state';
import type { RerunWorkflowExecutionParams } from '../../../pages/executions/build_replay_inputs_from_execution_context';
import { resolveSelectedStepExecution } from '../model/resolve_selected_step_execution';
import { useChildWorkflowExecutions } from '../model/use_child_workflow_executions';
import { useStepExecution } from '../model/use_step_execution';
import { useWaitingStepResume } from '../model/use_waiting_step_resume';

const WidthStorageKey = 'WORKFLOWS_EXECUTION_DETAILS_WIDTH';
const DefaultSidebarWidth = 300;

const PSEUDO_STEP_OVERVIEW = '__overview';
const PSEUDO_STEP_TRIGGER = 'trigger';

export interface WorkflowExecutionDetailProps {
  executionId: string;
  onClose: () => void;
  onReRunExecution?: (params: RerunWorkflowExecutionParams) => Promise<void>;
  showBackButton?: boolean;
  selectedStepExecutionId?: string | null;
  onSelectedStepExecutionChange?: (stepExecutionId: string | null) => void;
}

function assignSelectedStepId(
  selectedStepExecutionId: string | undefined,
  executionIdToStepId: Map<string, string>
) {
  if (!selectedStepExecutionId || selectedStepExecutionId === PSEUDO_STEP_OVERVIEW) {
    return undefined;
  }
  if (selectedStepExecutionId === PSEUDO_STEP_TRIGGER) {
    return HIGHLIGHTED_STEP_TRIGGER;
  }
  return executionIdToStepId.get(selectedStepExecutionId);
}

export const WorkflowExecutionDetail: React.FC<WorkflowExecutionDetailProps> = React.memo(
  ({
    executionId,
    onClose,
    onReRunExecution,
    showBackButton: showBackButtonOverride,
    selectedStepExecutionId: controlledSelectedStepExecutionId,
    onSelectedStepExecutionChange,
  }) => {
    const dispatch = useDispatch();
    const stepExecutionsTotal = useSelector(selectStepExecutionsTotal);
    const { workflowExecution, error } = useWorkflowExecutionPolling(executionId);
    const queryClient = useQueryClient();

    const urlState = useWorkflowUrlState();
    const [sidebarWidth = DefaultSidebarWidth, setSidebarWidth] = useLocalStorage(
      WidthStorageKey,
      DefaultSidebarWidth
    );
    const isStepSelectionControlled = onSelectedStepExecutionChange !== undefined;
    const selectedStepExecutionId = isStepSelectionControlled
      ? controlledSelectedStepExecutionId ?? undefined
      : urlState.selectedStepExecutionId;
    const setSelectedStepExecution = isStepSelectionControlled
      ? onSelectedStepExecutionChange
      : urlState.setSelectedStepExecution;
    const showBackButton = showBackButtonOverride ?? urlState.activeTab === 'executions';
    const { shouldAutoResume } = urlState;

    // Clear cached step I/O data when switching to a different execution
    useEffect(() => {
      return () => {
        queryClient.removeQueries({ queryKey: ['stepExecution', executionId] });
      };
    }, [executionId, queryClient]);

    useEffect(() => {
      if (
        !selectedStepExecutionId &&
        executionId === workflowExecution?.id &&
        (workflowExecution?.stepExecutions?.length ||
          isTerminalStatus(workflowExecution?.status) ||
          workflowExecution?.status === ExecutionStatus.QUEUED)
      ) {
        setSelectedStepExecution(PSEUDO_STEP_TRIGGER);
      }
    }, [workflowExecution, selectedStepExecutionId, setSelectedStepExecution, executionId]);

    const setSelectedStepExecutionId = useCallback(
      (stepExecutionId: string | null) => {
        setSelectedStepExecution(stepExecutionId);
      },
      [setSelectedStepExecution]
    );

    const workflowDefinition = useMemo(() => {
      if (workflowExecution) {
        return workflowExecution.workflowDefinition;
      }
      return null;
    }, [workflowExecution]);

    const { childExecutions, isLoading: isLoadingChildExecutions } =
      useChildWorkflowExecutions(workflowExecution);

    const {
      waitingStepExecutionId,
      resumeMessage,
      resumeSchema,
      approvalLabels,
      hasResumeError,
      retryResume,
    } = useWaitingStepResume(executionId, workflowExecution);

    // For pseudo-steps (overview, trigger), build from execution context directly
    const isPseudoStep =
      selectedStepExecutionId &&
      [PSEUDO_STEP_OVERVIEW, PSEUDO_STEP_TRIGGER].includes(selectedStepExecutionId);

    // Stable map: step-execution-id → workflow step-id (new ref only when entries change)
    const executionIdToStepId = useMemo(() => {
      const map = new Map<string, string>();
      for (const step of workflowExecution?.stepExecutions ?? []) {
        map.set(step.id, step.stepId);
      }
      return map;
    }, [workflowExecution?.stepExecutions]);

    // Sync selected step execution → Redux highlightedStepId for editor scroll & decorations.
    useEffect(() => {
      dispatch(
        setHighlightedStepId({
          stepId: assignSelectedStepId(selectedStepExecutionId, executionIdToStepId),
        })
      );
    }, [selectedStepExecutionId, executionIdToStepId, dispatch]);

    // Clear highlighted step when execution detail unmounts
    useEffect(() => {
      return () => {
        dispatch(setHighlightedStepId({ stepId: undefined }));
      };
    }, [dispatch]);

    const {
      lightweightStep,
      resolvedExecutionId,
      childWorkflowExecution: selectedStepChildExecution,
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
        selectedStepExecutionId,
        isPseudoStep,
        executionId,
        workflowExecution?.stepExecutions,
        childExecutions,
      ]
    );

    // Lazy-load full step data (with input/output) for real steps
    const { data: fullStepData, isLoading: isLoadingStepData } = useStepExecution(
      resolvedExecutionId,
      isPseudoStep ? undefined : selectedStepExecutionId ?? undefined,
      lightweightStep?.status
    );

    const selectedStepExecution = useMemo<WorkflowStepExecutionDto | undefined>(() => {
      if (!selectedStepExecutionId) {
        return undefined;
      }

      if (selectedStepExecutionId === PSEUDO_STEP_OVERVIEW && workflowExecution) {
        return buildOverviewStepExecutionFromContext(workflowExecution);
      }

      if (selectedStepExecutionId === PSEUDO_STEP_TRIGGER && workflowExecution?.context) {
        return buildTriggerStepExecutionFromContext(workflowExecution) ?? undefined;
      }

      if (!lightweightStep) {
        return undefined;
      }

      // Merge: use lightweight step for structure/status, overlay full I/O when available
      if (fullStepData) {
        return { ...lightweightStep, input: fullStepData.input, output: fullStepData.output };
      }

      return lightweightStep;
    }, [workflowExecution, selectedStepExecutionId, lightweightStep, fullStepData]);

    return (
      <EuiPanel paddingSize="none" color="plain" hasShadow={false} style={{ height: '100%' }}>
        <ResizableLayout
          fixedPanel={
            <WorkflowExecutionPanel
              definition={workflowDefinition}
              execution={workflowExecution ?? null}
              stepExecutionsTotal={stepExecutionsTotal}
              showBackButton={showBackButton}
              error={error}
              onClose={onClose}
              onReRunExecution={onReRunExecution}
              onStepExecutionClick={setSelectedStepExecutionId}
              selectedId={selectedStepExecutionId ?? null}
              childExecutionsMap={childExecutions}
              isLoadingChildExecutions={isLoadingChildExecutions}
              onBeforeDiagnose={() => setSelectedStepExecutionId(null)}
            />
          }
          fixedPanelSize={sidebarWidth}
          onFixedPanelSizeChange={setSidebarWidth}
          minFixedPanelSize={200}
          fixedPanelOrder={ResizableLayoutOrder.Start}
          flexPanel={
            <WorkflowStepExecutionDetails
              workflowExecutionId={executionId}
              stepExecution={selectedStepExecution}
              allStepExecutions={workflowExecution?.stepExecutions ?? []}
              onSelectStepExecution={setSelectedStepExecutionId}
              workflowExecutionDuration={workflowExecution?.duration ?? undefined}
              workflowExecutionUsage={workflowExecution?.usage}
              isLoadingStepData={isLoadingStepData && !isPseudoStep}
              workflowExecutionStatus={workflowExecution?.status}
              resumeMessage={resumeMessage}
              resumeSchema={resumeSchema}
              approvalLabels={approvalLabels}
              shouldAutoResume={shouldAutoResume}
              waitingStepExecutionId={waitingStepExecutionId}
              hasResumeError={hasResumeError}
              onRetryResume={retryResume}
              childWorkflowExecution={selectedStepChildExecution}
              parentWorkflowExecution={parentWorkflowExecution}
            />
          }
          minFlexPanelSize={200}
          mode={ResizableLayoutMode.Resizable}
          direction={ResizableLayoutDirection.Horizontal}
          resizeButtonClassName="workflowExecutionDetailResizeButton"
          data-test-subj="WorkflowEditorWithExecutionDetailLayout"
          className="workflowExecutionDetailResizableLayout"
        />
      </EuiPanel>
    );
  }
);
WorkflowExecutionDetail.displayName = 'WorkflowExecutionDetail';
