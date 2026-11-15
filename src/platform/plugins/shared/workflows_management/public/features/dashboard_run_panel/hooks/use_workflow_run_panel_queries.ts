/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import type { HttpStart } from '@kbn/core/public';
import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import { TerminalExecutionStatuses } from '@kbn/workflows';
import { WorkflowApi } from '@kbn/workflows-ui';

const POLL_INTERVAL_MS = 2_000;

const workflowKey = (workflowId: string) => ['dashboardRunPanel', 'workflow', workflowId];
const lastRunKey = (workflowId: string) => ['dashboardRunPanel', 'lastRun', workflowId];

export const isNotFoundError = (error: unknown): boolean => {
  const { response, body } = (error ?? {}) as {
    response?: { status?: number };
    body?: { statusCode?: number };
  };
  return response?.status === 404 || body?.statusCode === 404;
};

export const useWorkflowApi = (http: HttpStart): WorkflowApi =>
  useMemo(() => new WorkflowApi(http), [http]);

export const useWorkflowDetail = (api: WorkflowApi, workflowId: string | undefined) =>
  useQuery({
    queryKey: workflowKey(workflowId ?? ''),
    queryFn: () => api.getWorkflow(workflowId ?? ''),
    enabled: Boolean(workflowId),
    retry: false,
    refetchOnWindowFocus: false,
  });

/** The id of the workflow's most recent execution by anyone. */
export const useLastExecutionId = (api: WorkflowApi, workflowId: string, enabled: boolean) =>
  useQuery({
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

/** An execution with its step statuses (without step inputs or outputs), polled until it finishes. */
export const useExecutionWithSteps = (api: WorkflowApi, executionId: string | undefined) =>
  useQuery({
    queryKey: ['dashboardRunPanel', 'execution', executionId ?? ''],
    queryFn: () =>
      api.getExecution(executionId ?? '', { includeInput: false, includeOutput: false }),
    enabled: Boolean(executionId),
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: (execution) =>
      execution && TerminalExecutionStatuses.includes(execution.status) ? false : POLL_INTERVAL_MS,
  });

export interface RunWorkflowVariables {
  inputs: Record<string, unknown>;
  metadata: Record<string, string>;
}

export const useRunWorkflowFromPanel = (api: WorkflowApi, workflowId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ inputs, metadata }: RunWorkflowVariables) =>
      api.runWorkflow(workflowId, { inputs, metadata }),
    // Seeded from the response because the executions list may not include the new run until the index refreshes.
    onSuccess: ({ workflowExecutionId }) =>
      queryClient.setQueryData(lastRunKey(workflowId), workflowExecutionId),
  });
};
