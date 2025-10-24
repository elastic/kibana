/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { WorkflowExecuteModal } from '../../../features/run_workflow/ui/workflow_execute_modal';
import { useWorkflowUrlState } from '../../../hooks/use_workflow_url_state';
import { useAsyncThunkPromise } from '../../../widgets/workflow_yaml_editor/lib/store/hooks/use_async_thunk';
import {
  selectIsTestModalOpen,
  selectWorkflowDefinition,
} from '../../../widgets/workflow_yaml_editor/lib/store/selectors';
import { setIsTestModalOpen } from '../../../widgets/workflow_yaml_editor/lib/store/slice';
import { testWorkflowThunk } from '../../../widgets/workflow_yaml_editor/lib/store/thunks/test_workflow_thunk';

export const WorkflowDetailTestModal = () => {
  const dispatch = useDispatch();
  const { setSelectedExecution } = useWorkflowUrlState();
  const isTestModalOpen = useSelector(selectIsTestModalOpen);
  const definition = useSelector(selectWorkflowDefinition);

  const testWorkflow = useAsyncThunkPromise(testWorkflowThunk);

  const handleRunWorkflow = useCallback(
    async (inputs: Record<string, unknown>) => {
      const { workflowExecutionId } = await testWorkflow({ inputs });
      setSelectedExecution(workflowExecutionId);
    },
    [testWorkflow, setSelectedExecution]
  );

  const onClose = useCallback(() => {
    dispatch(setIsTestModalOpen({ isTestModalOpen: false }));
  }, [dispatch]);

  if (!isTestModalOpen || !definition) {
    return null;
  }

  return (
    <WorkflowExecuteModal definition={definition} onClose={onClose} onSubmit={handleRunWorkflow} />
  );
};
