/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';
import type { WorkflowGraph } from '@kbn/workflows/graph';
import { useContextOverrideData } from './use_context_override_data';
import { useWorkflowActions } from '../../../entities/workflows/model/use_workflow_actions';
import {
  selectEditorYaml,
  selectExecution,
  selectReplayStepExecutionId,
  selectTestStepModalOpenStepId,
  selectWorkflowGraph,
  selectWorkflowId,
} from '../../../entities/workflows/store/workflow_detail/selectors';
import {
  setReplayStepExecutionId,
  setTestStepModalOpenStepId,
} from '../../../entities/workflows/store/workflow_detail/slice';
import { StepExecuteModal } from '../../../features/run_workflow/ui/step_execute_modal';
import type { WorkflowStepTriggerTab } from '../../../features/run_workflow/ui/types';
import { useKibana } from '../../../hooks/use_kibana';
import { useWorkflowUrlState } from '../../../hooks/use_workflow_url_state';
import type { ContextOverrideData } from '../../../shared/utils/build_step_context_override/build_step_context_override';

export const WorkflowDetailTestStepModal = React.memo(() => {
  const dispatch = useDispatch();
  const { notifications } = useKibana().services;
  const { setSelectedExecution } = useWorkflowUrlState();
  const getContextOverrideData = useContextOverrideData();
  const { runIndividualStep } = useWorkflowActions();

  const workflowId = useSelector(selectWorkflowId);
  const testStepModalOpenStepId = useSelector(selectTestStepModalOpenStepId);
  const replayStepExecutionId = useSelector(selectReplayStepExecutionId);
  const execution = useSelector(selectExecution);
  const editorYaml = useSelector(selectEditorYaml) ?? '';
  const workflowGraph = useSelector(selectWorkflowGraph);

  const workflowGraphForStep = useMemo((): WorkflowGraph | null => {
    if (!testStepModalOpenStepId) return null;
    return workflowGraph ? workflowGraph.getStepGraph(testStepModalOpenStepId) : null;
  }, [testStepModalOpenStepId, workflowGraph]);

  const contextOverride = useMemo((): ContextOverrideData | null => {
    if (!testStepModalOpenStepId) {
      return null;
    }
    return getContextOverrideData(testStepModalOpenStepId);
  }, [testStepModalOpenStepId, getContextOverrideData]);

  const closeModal = useCallback(() => {
    dispatch(setTestStepModalOpenStepId(undefined));
    dispatch(setReplayStepExecutionId(null));
  }, [dispatch]);

  const submitStepRun = useCallback(
    async ({
      stepInputs,
      executionContext,
      triggerTab,
    }: {
      stepInputs: Record<string, unknown>;
      executionContext?: Record<string, unknown>;
      triggerTab: WorkflowStepTriggerTab;
    }) => {
      if (!testStepModalOpenStepId) {
        return;
      }
      try {
        const response = await runIndividualStep.mutateAsync({
          workflowId,
          stepId: testStepModalOpenStepId,
          workflowYaml: editorYaml,
          contextOverride: stepInputs,
          executionContext,
          triggerTab,
        });
        setSelectedExecution(response.workflowExecutionId);
        closeModal();
      } catch (error) {
        const errorMessage =
          (error as { body?: { message?: string }; message?: string })?.body?.message ||
          (error as Error)?.message ||
          'An unexpected error occurred while running the step';
        notifications.toasts.addError(new Error(errorMessage), {
          title: i18n.translate('workflows.detail.submitStepRun.error', {
            defaultMessage: 'Failed to run step',
          }),
        });
      }
    },
    [
      testStepModalOpenStepId,
      runIndividualStep,
      editorYaml,
      setSelectedExecution,
      closeModal,
      notifications.toasts,
      workflowId,
    ]
  );

  if (!testStepModalOpenStepId || !contextOverride) {
    return null;
  }

  return (
    <StepExecuteModal
      initialcontextOverride={contextOverride}
      onSubmit={submitStepRun}
      onClose={closeModal}
      initialStepExecutionId={replayStepExecutionId ?? undefined}
      initialWorkflowRunId={execution?.id}
      stepId={testStepModalOpenStepId}
      workflowGraph={workflowGraphForStep ?? undefined}
    />
  );
});
WorkflowDetailTestStepModal.displayName = 'WorkflowDetailTestStepModal';
