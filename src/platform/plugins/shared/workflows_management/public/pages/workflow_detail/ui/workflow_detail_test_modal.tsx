/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux-v7';
import { i18n } from '@kbn/i18n';
import { useRunWorkflow, useTestWorkflow, useWorkflowsCapabilities } from '@kbn/workflows-ui';
import {
  selectEditorYaml,
  selectIsTestModalOpen,
  selectReplayExecutionId,
  selectReplayIsTestRun,
  selectWorkflow,
  selectWorkflowDefinition,
  selectWorkflowId,
} from '../../../entities/workflows/store/workflow_detail/selectors';
import {
  clearReplay,
  setIsTestModalOpen,
} from '../../../entities/workflows/store/workflow_detail/slice';
import { testWorkflowThunk } from '../../../entities/workflows/store/workflow_detail/thunks/test_workflow_thunk';
import type { WorkflowTriggerTab } from '../../../features/run_workflow/ui/types';
import { WorkflowExecuteModal } from '../../../features/run_workflow/ui/workflow_execute_modal';
import { useAsyncThunk } from '../../../hooks/use_async_thunk';
import { useKibana } from '../../../hooks/use_kibana';
import { useWorkflowUrlState } from '../../../hooks/use_workflow_url_state';

export const WorkflowDetailTestModal = () => {
  const dispatch = useDispatch();
  const { notifications } = useKibana().services;
  const { canExecuteWorkflow: hasExecutePrivilege } = useWorkflowsCapabilities();
  const workflow = useSelector(selectWorkflow);
  const canExecuteWorkflow = hasExecutePrivilege && workflow?.permissions?.execute !== false;

  const { setSelectedExecution } = useWorkflowUrlState();

  const isTestModalOpen = useSelector(selectIsTestModalOpen);
  const replayExecutionId = useSelector(selectReplayExecutionId);
  const replayIsTestRun = useSelector(selectReplayIsTestRun);
  const definition = useSelector(selectWorkflowDefinition);
  const workflowId = useSelector(selectWorkflowId);
  const yamlString = useSelector(selectEditorYaml);

  const testWorkflow = useAsyncThunk(testWorkflowThunk);
  const { mutateAsync: runWorkflow } = useRunWorkflow();
  const { mutateAsync: testSavedWorkflow } = useTestWorkflow();
  const isReplay = Boolean(replayExecutionId);
  // Stored with the replay id at click time. The page store is empty until the
  // execution loads, which is after a no-input workflow auto-submits.
  const isProductionReplay = isReplay && !replayIsTestRun;

  const handleRunWorkflow = useCallback(
    async (inputs: Record<string, unknown>, triggerTab?: WorkflowTriggerTab) => {
      if (isReplay) {
        if (!workflowId) {
          const missingIdError = new Error(
            i18n.translate('workflows.detail.testModal.reRunMissingWorkflowId', {
              defaultMessage: 'Workflow id is missing',
            })
          );
          notifications.toasts.addError(missingIdError, {
            title: i18n.translate('workflows.detail.testModal.reRunFailed', {
              defaultMessage: 'Failed to re-run workflow',
            }),
            toastLifeTimeMs: 5000,
          });
          throw missingIdError;
        }

        try {
          const result = replayIsTestRun
            ? await testSavedWorkflow({ workflowId, inputs })
            : await runWorkflow({ id: workflowId, inputs });
          if (result?.workflowExecutionId) {
            setSelectedExecution(result.workflowExecutionId);
          }
        } catch (error) {
          notifications.toasts.addError(error as Error, {
            title: i18n.translate('workflows.detail.testModal.reRunFailed', {
              defaultMessage: 'Failed to re-run workflow',
            }),
            toastLifeTimeMs: 5000,
          });
          throw error;
        }
        return;
      }

      const executionId = await testWorkflow({ inputs, triggerTab });

      if (executionId) {
        setSelectedExecution(executionId.workflowExecutionId);
      }
    },
    [
      isReplay,
      notifications.toasts,
      replayIsTestRun,
      runWorkflow,
      setSelectedExecution,
      testSavedWorkflow,
      testWorkflow,
      workflowId,
    ]
  );

  const closeModal = useCallback(() => {
    dispatch(setIsTestModalOpen(false));
    dispatch(clearReplay());
  }, [dispatch]);

  useEffect(() => {
    if (!isTestModalOpen) {
      return;
    }

    if (!canExecuteWorkflow) {
      notifications.toasts.addWarning(
        i18n.translate('workflows.detail.testModal.warningNoPermissions', {
          defaultMessage: 'You do not have permission to run workflows.',
        }),
        { toastLifeTimeMs: 3000 }
      );
      closeModal();
      return;
    }

    if (!definition && !yamlString) {
      return;
    }

    if (!definition) {
      notifications.toasts.addWarning(
        i18n.translate('workflows.detail.testModal.warningInvalidDefinition', {
          defaultMessage: 'Please fix the errors to run the workflow.',
        }),
        { toastLifeTimeMs: 3000 }
      );
      closeModal();
    }
  }, [
    closeModal,
    canExecuteWorkflow,
    definition,
    isTestModalOpen,
    notifications.toasts,
    yamlString,
  ]);

  if (!isTestModalOpen || !definition || !canExecuteWorkflow) {
    return null;
  }

  return (
    <WorkflowExecuteModal
      isTestRun={!isProductionReplay}
      definition={definition}
      workflowId={workflowId}
      yamlString={yamlString}
      onClose={closeModal}
      onSubmit={handleRunWorkflow}
      initialExecutionId={replayExecutionId ?? undefined}
    />
  );
};
