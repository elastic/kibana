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
import { useTestWorkflow } from '../../../widgets/workflow_yaml_editor/lib/store/hooks/use_test_workflow';
import {
  selectIsTestModalOpen,
  selectWorkflowDefinition,
} from '../../../widgets/workflow_yaml_editor/lib/store/selectors';
import { setIsTestModalOpen } from '../../../widgets/workflow_yaml_editor/lib/store/slice';

export const WorkflowDetailTestModal = () => {
  const dispatch = useDispatch();
  const isTestModalOpen = useSelector(selectIsTestModalOpen);
  const definition = useSelector(selectWorkflowDefinition);

  const { testWorkflow } = useTestWorkflow();

  const handleRunWorkflow = useCallback(
    (inputs: Record<string, unknown>) => {
      testWorkflow(inputs);
    },
    [testWorkflow]
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
