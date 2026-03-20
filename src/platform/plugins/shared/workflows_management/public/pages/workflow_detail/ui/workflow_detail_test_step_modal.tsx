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
import { v4 as generateUuid } from 'uuid';
import { i18n } from '@kbn/i18n';
import { WorkflowGraph } from '@kbn/workflows/graph';
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
import { useKibana } from '../../../hooks/use_kibana';
import { useSpaceId } from '../../../hooks/use_space_id';
import { useWorkflowUrlState } from '../../../hooks/use_workflow_url_state';
import type { ContextOverrideData } from '../../../shared/utils/build_step_context_override/build_step_context_override';
import { buildContextOverride } from '../../../shared/utils/build_step_context_override/build_step_context_override';

export const WorkflowDetailTestStepModal = React.memo(() => {
  const dispatch = useDispatch();
  const { notifications } = useKibana().services;
  const spaceId = useSpaceId();
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
    if (replayStepExecutionId != null && execution?.workflowDefinition) {
      const fullGraph = WorkflowGraph.fromWorkflowDefinition(execution.workflowDefinition);
      return fullGraph.getStepGraph(testStepModalOpenStepId);
    }
    return workflowGraph ? workflowGraph.getStepGraph(testStepModalOpenStepId) : null;
  }, [
    testStepModalOpenStepId,
    replayStepExecutionId,
    execution?.workflowDefinition,
    workflowGraph,
  ]);

  const contextOverride = useMemo((): ContextOverrideData | null => {
    if (!testStepModalOpenStepId) {
      return null;
    }
    if (replayStepExecutionId != null && execution?.workflowDefinition) {
      const workflowDefinition = execution.workflowDefinition;
      const executionWorkflowGraph = WorkflowGraph.fromWorkflowDefinition(workflowDefinition);
      const stepSubGraph = executionWorkflowGraph.getStepGraph(testStepModalOpenStepId);
      if (!spaceId) {
        return null;
      }
      return buildContextOverride(stepSubGraph, {
        consts: workflowDefinition.consts,
        workflow: {
          id: generateUuid(),
          name: workflowDefinition.name,
          enabled: workflowDefinition.enabled ?? true,
          spaceId,
        },
        inputsDefinition: workflowDefinition.inputs,
      });
    }
    return getContextOverrideData(testStepModalOpenStepId);
  }, [
    testStepModalOpenStepId,
    replayStepExecutionId,
    execution?.workflowDefinition,
    spaceId,
    getContextOverrideData,
  ]);

  const closeModal = useCallback(() => {
    dispatch(setTestStepModalOpenStepId(undefined));
    dispatch(setReplayStepExecutionId(null));
  }, [dispatch]);

  const submitStepRun = useCallback(
    async (stepId: string, stepInputs: Record<string, unknown>) => {
      try {
        const response = await runIndividualStep.mutateAsync({
          workflowId,
          stepId,
          workflowYaml: editorYaml,
          contextOverride: stepInputs,
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
      onSubmit={({ stepInputs }) => submitStepRun(testStepModalOpenStepId, stepInputs)}
      onClose={closeModal}
      initialStepExecutionId={replayStepExecutionId ?? undefined}
      initialWorkflowRunId={execution?.id}
      initialTab={replayStepExecutionId ? 'historical' : undefined}
      stepId={testStepModalOpenStepId}
      workflowGraph={workflowGraphForStep ?? undefined}
    />
  );
});
WorkflowDetailTestStepModal.displayName = 'WorkflowDetailTestStepModal';
