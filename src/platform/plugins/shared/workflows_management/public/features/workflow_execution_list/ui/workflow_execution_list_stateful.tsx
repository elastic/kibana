/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { useWorkflowExecutions } from '../../../entities/workflows/model/useWorkflowExecutions';
import { useWorkflowUrlState } from '../../../hooks/use_workflow_url_state';
import { WorkflowExecutionList as WorkflowExecutionListComponent } from './workflow_execution_list';

interface WorkflowExecutionListProps {
  workflowId: string | null;
}

export function WorkflowExecutionList({ workflowId }: WorkflowExecutionListProps) {
  const {
    data: workflowExecutions,
    isLoading: isLoadingWorkflowExecutions,
    error,
  } = useWorkflowExecutions(workflowId);

  const { selectedExecutionId, setSelectedExecution } = useWorkflowUrlState();

  const handleViewWorkflowExecution = (executionId: string) => {
    setSelectedExecution(executionId);
  };

  return (
    <WorkflowExecutionListComponent
      executions={workflowExecutions ?? null}
      onExecutionClick={handleViewWorkflowExecution}
      selectedId={selectedExecutionId ?? null}
      isLoading={isLoadingWorkflowExecutions}
      error={error as Error | null}
    />
  );
}
