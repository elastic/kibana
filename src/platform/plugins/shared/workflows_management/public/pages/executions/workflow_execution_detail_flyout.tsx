/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { RerunWorkflowExecutionParams } from './build_replay_inputs_from_execution_context';
import { WorkflowDetailStoreProvider } from '../../entities/workflows/store/provider';
import { WorkflowExecutionFlyout } from '../../features/workflow_execution_detail';

export interface WorkflowExecutionDetailFlyoutProps {
  executionId: string;
  onClose: () => void;
  /** Call-site compatibility; re-run lives in the shared flyout Take Action menu. */
  onReRunExecution?: (params: RerunWorkflowExecutionParams) => Promise<void>;
  /** Call-site compatibility; filter actions remain on the executions table. */
  onViewAllExecutionsForWorkflow?: (workflowId: string) => void;
}

/**
 * Executions-page adapter for the shared execution flyout (same UI as workflow detail).
 * This route is already gated by `workflowsManagement:globalExecutionsView:enabled`.
 */
export const WorkflowExecutionDetailFlyout = React.memo<WorkflowExecutionDetailFlyoutProps>(
  ({ executionId, onClose }) => {
    return (
      <WorkflowDetailStoreProvider>
        <WorkflowExecutionFlyout executionId={executionId} onClose={onClose} />
      </WorkflowDetailStoreProvider>
    );
  }
);
WorkflowExecutionDetailFlyout.displayName = 'WorkflowExecutionDetailFlyout';
