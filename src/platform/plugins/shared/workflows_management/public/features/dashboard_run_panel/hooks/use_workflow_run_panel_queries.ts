/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';
import type { FetchContext } from '@kbn/presentation-publishing';
import { useQuery, useQueryClient } from '@kbn/react-query';
import { ExecutionStatus, isTerminalStatus } from '@kbn/workflows';
import { useRunWorkflow, useWorkflowsApi } from '@kbn/workflows-ui';

const POLL_INTERVAL_MS = 2_000;
const PARKED_POLL_INTERVAL_MS = 30_000;

/** Statuses of a run that is paused until something else happens, which can take hours. */
const PARKED_STATUSES: readonly ExecutionStatus[] = [
  ExecutionStatus.WAITING,
  ExecutionStatus.WAITING_FOR_INPUT,
  ExecutionStatus.WAITING_FOR_CHILD,
];

/** Whether a run is still starting or executing steps, as opposed to finished or parked. */
export const isExecutionInProgress = (status: ExecutionStatus): boolean =>
  !isTerminalStatus(status) && !PARKED_STATUSES.includes(status);

/** How often to refetch a run with the given status, or `false` once it has finished. */
export const getPollInterval = (status: ExecutionStatus | undefined): number | false => {
  if (status === undefined) return POLL_INTERVAL_MS;
  if (isTerminalStatus(status)) return false;
  return PARKED_STATUSES.includes(status) ? PARKED_POLL_INTERVAL_MS : POLL_INTERVAL_MS;
};

const workflowKey = (workflowId: string) => ['dashboardRunPanel', 'workflow', workflowId];
const lastRunKey = (workflowId: string) => ['dashboardRunPanel', 'lastRun', workflowId];

export const useWorkflowDetail = (workflowId: string | undefined) => {
  const api = useWorkflowsApi();
  return useQuery({
    queryKey: workflowKey(workflowId ?? ''),
    queryFn: () => api.getWorkflow(workflowId ?? ''),
    enabled: Boolean(workflowId),
    retry: false,
    refetchOnWindowFocus: false,
  });
};

/** The id of the workflow's most recent execution by anyone. */
export const useLastExecutionId = (workflowId: string, enabled: boolean) => {
  const api = useWorkflowsApi();
  return useQuery({
    queryKey: lastRunKey(workflowId),
    queryFn: async () => {
      const { results } = await api.getWorkflowExecutions(workflowId, {
        size: 1,
        sortField: 'createdAt',
        sortOrder: 'desc',
        omitStepRuns: true,
      });
      return results[0]?.id ?? null;
    },
    enabled,
    retry: false,
    refetchOnWindowFocus: false,
  });
};

/** An execution with its step statuses (without step inputs or outputs), polled until it finishes; slower while it is parked. */
export const useExecutionWithSteps = (executionId: string | undefined) => {
  const api = useWorkflowsApi();
  return useQuery({
    queryKey: ['dashboardRunPanel', 'execution', executionId ?? ''],
    queryFn: () =>
      api.getExecution(executionId ?? '', { includeInput: false, includeOutput: false }),
    enabled: Boolean(executionId),
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: (execution) => getPollInterval(execution?.status),
  });
};

/** Refetches the workflow and its last run when the dashboard is refreshed. */
export const useRefetchOnReload = (fetchContext: FetchContext, workflowId: string): void => {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!fetchContext.isReload) return;
    queryClient.invalidateQueries({ queryKey: workflowKey(workflowId) });
    queryClient.invalidateQueries({ queryKey: lastRunKey(workflowId) });
  }, [fetchContext, queryClient, workflowId]);
};

export const useRunWorkflowFromPanel = () => {
  const queryClient = useQueryClient();
  return useRunWorkflow({
    // Seeded from the response because the executions list may not include the new run until the index refreshes.
    onSuccess: ({ workflowExecutionId }, { id }) =>
      queryClient.setQueryData(lastRunKey(id), workflowExecutionId),
  });
};
