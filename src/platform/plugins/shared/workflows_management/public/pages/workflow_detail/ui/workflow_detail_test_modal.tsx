/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';
import {
  selectEditorYaml,
  selectIsTestModalOpen,
  selectWorkflowDefinition,
  selectWorkflowId,
} from '../../../entities/workflows/store/workflow_detail/selectors';
import { setIsTestModalOpen } from '../../../entities/workflows/store/workflow_detail/slice';
import { testWorkflowThunk } from '../../../entities/workflows/store/workflow_detail/thunks/test_workflow_thunk';
import { WorkflowExecuteModal } from '../../../features/run_workflow/ui/workflow_execute_modal';
import { useAsyncThunk } from '../../../hooks/use_async_thunk';
import { useCapabilities } from '../../../hooks/use_capabilities';
import { useKibana } from '../../../hooks/use_kibana';
import { useWorkflowUrlState } from '../../../hooks/use_workflow_url_state';

export const WorkflowDetailTestModal = () => {
  const dispatch = useDispatch();
  const { notifications } = useKibana().services;
  const { canExecuteWorkflow } = useCapabilities();

  const { setSelectedExecution } = useWorkflowUrlState();

  const isTestModalOpen = useSelector(selectIsTestModalOpen);
  const definition = useSelector(selectWorkflowDefinition);
  const workflowId = useSelector(selectWorkflowId);
  const yamlString = useSelector(selectEditorYaml);

  const testWorkflow = useAsyncThunk(testWorkflowThunk);

  const handleRunWorkflow = useCallback(
    async (inputs: Record<string, unknown>, triggerTab?: 'manual' | 'alert' | 'index') => {
      const executionId = await testWorkflow({ inputs, triggerTab });

      if (executionId) {
        setSelectedExecution(executionId.workflowExecutionId);
      }
    },
    [testWorkflow, setSelectedExecution]
  );

  const closeModal = useCallback(() => {
    dispatch(setIsTestModalOpen(false));
  }, [dispatch]);

  useEffect(() => {
    if (isTestModalOpen) {
      if (!canExecuteWorkflow) {
        notifications.toasts.addWarning(
          i18n.translate('workflows.detail.testModal.warningNoPermissions', {
            defaultMessage: 'You do not have permission to run workflows.',
          }),
          { toastLifeTimeMs: 3000 }
        );
        closeModal();
      } else if (!definition) {
        notifications.toasts.addWarning(
          i18n.translate('workflows.detail.testModal.warningInvalidDefinition', {
            defaultMessage: 'Please fix the errors to run the workflow.',
          }),
          { toastLifeTimeMs: 3000 }
        );
        closeModal();
      }
    }
  }, [closeModal, canExecuteWorkflow, isTestModalOpen, definition, notifications.toasts]);

  if (!isTestModalOpen || !definition || !canExecuteWorkflow) {
    return null;
  }

  return (
    <WorkflowExecuteModal
      isTestRun={true}
      definition={definition}
      workflowId={workflowId}
      yamlString={yamlString}
      onClose={closeModal}
      onSubmit={handleRunWorkflow}
    />
  );
};
