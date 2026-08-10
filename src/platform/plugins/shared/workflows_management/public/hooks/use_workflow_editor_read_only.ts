/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useSelector } from 'react-redux-v7';
import { useParams } from 'react-router-dom';
import { useWorkflowsCapabilities } from '@kbn/workflows-ui';
import { useWorkflowUrlState } from './use_workflow_url_state';
import {
  selectIsEditorExecutionYaml,
  selectWorkflow,
} from '../entities/workflows/store/workflow_detail/selectors';

export const useWorkflowEditorReadOnly = (): boolean => {
  const { id: workflowId } = useParams<{ id?: string }>();
  const workflow = useSelector(selectWorkflow);
  const isExecutionYaml = useSelector(selectIsEditorExecutionYaml);
  const { selectedExecutionId } = useWorkflowUrlState();
  const { canCreateWorkflow, canUpdateWorkflow } = useWorkflowsCapabilities();
  const canEditWorkflow = workflowId ? canUpdateWorkflow : canCreateWorkflow;

  return (
    Boolean(selectedExecutionId) ||
    isExecutionYaml ||
    workflow?.managed === true ||
    !canEditWorkflow
  );
};
