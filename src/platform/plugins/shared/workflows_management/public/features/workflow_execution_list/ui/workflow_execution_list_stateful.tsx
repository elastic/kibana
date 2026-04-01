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
import { ExecutionStatus, type ExecutionType, isTerminalStatus } from '@kbn/workflows';
import { WORKFLOWS_UI_SHOW_EXECUTOR_SETTING_ID } from '@kbn/workflows/common/constants';
import { useWorkflowsApi } from '@kbn/workflows-ui';
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
  const { uiSettings, application, notifications } = useKibana().services;
  const api = useWorkflowsApi();
  const telemetry = useTelemetry();
  const showExecutor =
    uiSettings?.get<boolean>(WORKFLOWS_UI_SHOW_EXECUTOR_SETTING_ID, false) ?? false;
  const [refetchInterval, setRefetchInterval] = useState(EXECUTIONS_LIST_REFETCH_INTERVAL);
  const [filters, setFilters] = useState<ExecutionListFiltersQueryParams>(DEFAULT_FILTERS);
  const [isCancelLoadedNonTerminalInProgress, setIsCancelLoadedNonTerminalInProgress] =
    useState(false);

  const canCancelLoadedNonTerminal = Boolean(
    application?.capabilities.workflowsManagement.cancelWorkflowExecution
  );

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

  const onConfirmCancelLoadedNonTerminal = useCallback(async () => {
    if (!workflowExecutions || !workflowId) {
      return;
    }

    const targets = workflowExecutions.results.filter((e) => !isTerminalStatus(e.status));

    if (targets.length === 0) {
      return;
    }

    setIsCancelLoadedNonTerminalInProgress(true);

    try {
      const results = await Promise.allSettled(targets.map((t) => api.cancelExecution(t.id)));

      let failureCount = 0;

      results.forEach((result, i) => {
        const execution = targets[i];
        const timeToCancellation = execution.startedAt
          ? Date.now() - new Date(execution.startedAt).getTime()
          : undefined;

        if (result.status === 'fulfilled') {
          telemetry.reportWorkflowRunCancelled({
            workflowExecutionId: execution.id,
            workflowId: execution.workflowId ?? workflowId,
            timeToCancellation,
            origin: 'workflow_detail',
          });
        } else {
          failureCount += 1;
          const err =
            result.reason instanceof Error ? result.reason : new Error(String(result.reason));
          telemetry.reportWorkflowRunCancelled({
            workflowExecutionId: execution.id,
            workflowId: execution.workflowId ?? workflowId,
            timeToCancellation,
            origin: 'workflow_detail',
            error: err,
          });
        }
      });

      const totalCount = targets.length;
      const successCount = totalCount - failureCount;

      if (failureCount > 0 && successCount === 0) {
        notifications?.toasts.addDanger(
          i18n.translate('workflows.workflowExecutionList.footerCancelNonTerminal.allFailed', {
            defaultMessage:
              'Failed to cancel {count, plural, one {# execution} other {# executions}}',
            values: { count: totalCount },
          }),
          { toastLifeTimeMs: 5000 }
        );
      } else if (failureCount > 0) {
        notifications?.toasts.addWarning(
          i18n.translate('workflows.workflowExecutionList.footerCancelNonTerminal.partialFailure', {
            defaultMessage:
              '{successCount} of {totalCount} executions cancelled. {failureCount, plural, one {# could not be cancelled} other {# could not be cancelled}}.',
            values: { successCount, totalCount, failureCount },
          }),
          { toastLifeTimeMs: 5000 }
        );
      } else if (successCount > 0) {
        notifications?.toasts.addSuccess({
          title:
            successCount === 1
              ? i18n.translate(
                  'workflows.workflowExecutionList.footerCancelNonTerminal.successSingle',
                  {
                    defaultMessage: '1 execution cancelled',
                  }
                )
              : i18n.translate(
                  'workflows.workflowExecutionList.footerCancelNonTerminal.successMultiple',
                  {
                    defaultMessage: '{count} executions cancelled',
                    values: { count: successCount },
                  }
                ),
        });
      }

      try {
        await refetch();
      } catch (refetchError) {
        const err = refetchError instanceof Error ? refetchError : new Error(String(refetchError));
        notifications?.toasts.addError(err, {
          title: i18n.translate(
            'workflows.workflowExecutionList.footerCancelNonTerminal.refetchErrorTitle',
            {
              defaultMessage: 'Could not refresh execution list',
            }
          ),
        });
      }
    } finally {
      setIsCancelLoadedNonTerminalInProgress(false);
    }
  }, [api, notifications, refetch, telemetry, workflowExecutions, workflowId]);

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
      canCancelLoadedNonTerminal={canCancelLoadedNonTerminal}
      isCancelLoadedNonTerminalInProgress={isCancelLoadedNonTerminalInProgress}
      onConfirmCancelLoadedNonTerminal={onConfirmCancelLoadedNonTerminal}
    />
  );
}
