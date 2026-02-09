/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import { ExecutionStatus, type ExecutionType } from '@kbn/workflows';
import { WorkflowExecutionList as WorkflowExecutionListComponent } from './workflow_execution_list';
import { useWorkflowExecutions } from '../../../entities/workflows/model/use_workflow_executions';
import { useWorkflowUrlState } from '../../../hooks/use_workflow_url_state';

const EXECUTIONS_LIST_REFETCH_INTERVAL = 5000;
const EXECUTIONS_LIST_REFETCH_INTERVAL_ACTIVE = 1000;

export interface ExecutionListFiltersQueryParams {
  statuses: ExecutionStatus[];
  executionTypes: ExecutionType[];
  executedBy: string[];
}

const DEFAULT_FILTERS: ExecutionListFiltersQueryParams = {
  statuses: [],
  executionTypes: [],
  executedBy: [],
};

interface WorkflowExecutionListProps {
  workflowId: string | null;
}

export function WorkflowExecutionList({ workflowId }: WorkflowExecutionListProps) {
  const [refetchInterval, setRefetchInterval] = useState(EXECUTIONS_LIST_REFETCH_INTERVAL);
  const [filters, setFilters] = useState<ExecutionListFiltersQueryParams>(DEFAULT_FILTERS);
  const {
    data: workflowExecutions,
    isInitialLoading: isLoadingWorkflowExecutions,
    isLoadingMore: isLoadingMoreWorkflowExecutions,
    error,
    setPaginationObserver,
  } = useWorkflowExecutions(
    {
      workflowId,
      statuses: filters.statuses,
      executionTypes: filters.executionTypes,
      executedBy: filters.executedBy,
    },
    {
      refetchInterval,
    }
  );

  useEffect(() => {
    if (!workflowExecutions) {
      return;
    }
    const activeExecutions = workflowExecutions.results.some((execution) =>
      [
        ExecutionStatus.PENDING,
        ExecutionStatus.RUNNING,
        ExecutionStatus.WAITING_FOR_INPUT,
      ].includes(execution.status)
    );

    // If there are active executions, refetch more frequently
    if (activeExecutions) {
      setRefetchInterval(EXECUTIONS_LIST_REFETCH_INTERVAL_ACTIVE);
    } else {
      setRefetchInterval(EXECUTIONS_LIST_REFETCH_INTERVAL);
    }
  }, [workflowExecutions]);

  // Reset scroll when filters change
  useEffect(() => {
    // Reset to default when workflow changes
  }, [filters.statuses, filters.executionTypes, filters.executedBy]);

  const { selectedExecutionId, setSelectedExecution } = useWorkflowUrlState();

  const handleViewWorkflowExecution = (executionId: string) => {
    setSelectedExecution(executionId);
  };

  return (
    <WorkflowExecutionListComponent
      executions={workflowExecutions ?? null}
      onExecutionClick={handleViewWorkflowExecution}
      selectedId={selectedExecutionId ?? null}
      isInitialLoading={isLoadingWorkflowExecutions}
      isLoadingMore={isLoadingMoreWorkflowExecutions}
      error={error as Error | null}
      filters={filters}
      onFiltersChange={setFilters}
      setPaginationObserver={setPaginationObserver}
    />
  );
}
