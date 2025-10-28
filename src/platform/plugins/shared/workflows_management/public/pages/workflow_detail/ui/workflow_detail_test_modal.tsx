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
import { WorkflowExecuteModal } from '../../../features/run_workflow/ui/workflow_execute_modal';
import { useCapabilities } from '../../../hooks/use_capabilities';
import { useKibana } from '../../../hooks/use_kibana';
import { useWorkflowUrlState } from '../../../hooks/use_workflow_url_state';
import { useAsyncThunk } from '../../../widgets/workflow_yaml_editor/lib/store/hooks/use_async_thunk';
import {
  selectIsTestModalOpen,
  selectWorkflowDefinition,
} from '../../../widgets/workflow_yaml_editor/lib/store/selectors';
import { setIsTestModalOpen } from '../../../widgets/workflow_yaml_editor/lib/store/slice';
import { testWorkflowThunk } from '../../../widgets/workflow_yaml_editor/lib/store/thunks/test_workflow_thunk';

export const WorkflowDetailTestModal = () => {
  const dispatch = useDispatch();
  const { notifications } = useKibana().services;
  const { canExecuteWorkflow } = useCapabilities();

  const { setSelectedExecution } = useWorkflowUrlState();

  const isTestModalOpen = useSelector(selectIsTestModalOpen);
  const definition = useSelector(selectWorkflowDefinition);

  const testWorkflow = useAsyncThunk(testWorkflowThunk);
  const handleRunWorkflow = useCallback(
    async (inputs: Record<string, unknown>) => {
      const result = await testWorkflow({ inputs });
      if (result) {
        setSelectedExecution(result.workflowExecutionId);
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
      definition={definition}
      onClose={closeModal}
      onSubmit={handleRunWorkflow}
    />
  );
};
