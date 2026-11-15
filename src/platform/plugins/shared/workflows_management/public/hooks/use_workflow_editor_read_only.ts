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
import type { WorkflowEditorReadOnlyReason } from '@kbn/workflows/common/constants';
import { useWorkflowsCapabilities } from '@kbn/workflows-ui';
import { useWorkflowUrlState } from './use_workflow_url_state';
import { selectWorkflow } from '../entities/workflows/store/workflow_detail/selectors';

/** Returns why the workflow editor is read-only, or undefined when the user can edit. */
export const useWorkflowEditorReadOnlyReason = (): WorkflowEditorReadOnlyReason | undefined => {
  const { id: workflowId } = useParams<{ id?: string }>();
  const workflow = useSelector(selectWorkflow);
  const { activeTab } = useWorkflowUrlState();
  const { canCreateWorkflow, canUpdateWorkflow } = useWorkflowsCapabilities();
  const canEditWorkflow = workflowId
    ? canUpdateWorkflow && workflow?.permissions?.edit !== false
    : canCreateWorkflow;

  // The executions tab shows past execution snapshots, so editing is never meaningful there. The URL
  // is the source of truth so the editor is read-only right away, before the store catches up.
  // Running a test from the workflow tab also puts an executionId in the URL, but stays editable.
  // Managed and permission reasons come first: they also block the Workflow tab.
  if (workflow?.managed === true) return 'managed';
  if (!canEditWorkflow) return 'no_permission';
  if (activeTab === 'executions') return 'executions_tab';
  return undefined;
};

export const useWorkflowEditorReadOnly = (): boolean =>
  useWorkflowEditorReadOnlyReason() !== undefined;
