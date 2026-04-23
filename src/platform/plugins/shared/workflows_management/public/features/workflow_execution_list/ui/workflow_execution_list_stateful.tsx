/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { ExecutionStatus, type ExecutionType } from '@kbn/workflows';
import { WORKFLOWS_UI_SHOW_EXECUTOR_SETTING_ID } from '@kbn/workflows/common/constants';
import { useWorkflowsApi, useWorkflowsCapabilities } from '@kbn/workflows-ui';
import { WorkflowExecutionList as WorkflowExecutionListComponent } from './workflow_execution_list';
import { useWorkflowExecutions } from '../../../entities/workflows/model/use_workflow_executions';
import { useKibana } from '../../../hooks/use_kibana';
import { useTelemetry } from '../../../hooks/use_telemetry';
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
  const { uiSettings, notifications } = useKibana().services;
  const api = useWorkflowsApi();
  const telemetry = useTelemetry();
  const showExecutor =
    uiSettings?.get<boolean>(WORKFLOWS_UI_SHOW_EXECUTOR_SETTING_ID, false) ?? false;
  const [refetchInterval, setRefetchInterval] = useState(EXECUTIONS_LIST_REFETCH_INTERVAL);
  const [filters, setFilters] = useState<ExecutionListFiltersQueryParams>(DEFAULT_FILTERS);
  const [isCancelInProgress, setIsCancelInProgress] = useState(false);

  const { canCancelWorkflowExecution } = useWorkflowsCapabilities();

  const {
    data: workflowExecutions,
    isInitialLoading: isLoadingWorkflowExecutions,
    isLoadingMore: isLoadingMoreWorkflowExecutions,
    error,
    setPaginationObserver,
    refetch,
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

    if (activeExecutions) {
      setRefetchInterval(EXECUTIONS_LIST_REFETCH_INTERVAL_ACTIVE);
    } else {
      setRefetchInterval(EXECUTIONS_LIST_REFETCH_INTERVAL);
    }
  }, [workflowExecutions]);

  useEffect(() => {
    // Reset to default when workflow changes
  }, [filters.statuses, filters.executionTypes, filters.executedBy]);

  const { selectedExecutionId, setSelectedExecution } = useWorkflowUrlState();

  const handleViewWorkflowExecution = (executionId: string) => {
    setSelectedExecution(executionId);
  };

  const onConfirmCancel = useCallback(async () => {
    if (!workflowId) {
      return;
    }

    setIsCancelInProgress(true);

    try {
      await api.cancelAllWorkflowExecutions(workflowId);
      telemetry.reportWorkflowExecutionsCancelled({
        workflowId,
        origin: 'workflow_detail',
      });
      notifications?.toasts.addSuccess({
        title: i18n.translate(
          'workflows.workflowExecutionList.cancelActiveExecutions.bulkSuccess',
          {
            defaultMessage: 'Cancellation requested for all active executions of this workflow',
          }
        ),
      });
      await refetch();
    } catch (cancelError) {
      const err = cancelError instanceof Error ? cancelError : new Error(String(cancelError));
      telemetry.reportWorkflowExecutionsCancelled({
        workflowId,
        origin: 'workflow_detail',
        error: err,
      });
      notifications?.toasts.addError(err, {
        title: i18n.translate(
          'workflows.workflowExecutionList.cancelActiveExecutions.bulkFailureTitle',
          {
            defaultMessage: 'Could not cancel active executions',
          }
        ),
      });
    } finally {
      setIsCancelInProgress(false);
    }
  }, [api, notifications, refetch, telemetry, workflowId]);

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
      showExecutor={showExecutor}
      canCancel={canCancelWorkflowExecution}
      isCancelInProgress={isCancelInProgress}
      onConfirmCancel={onConfirmCancel}
    />
  );
}
