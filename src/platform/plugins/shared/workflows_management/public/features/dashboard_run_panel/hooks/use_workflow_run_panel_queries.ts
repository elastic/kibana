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
import type { WorkflowExecutionListItemDto } from '@kbn/workflows';
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

const isTerminal = (execution: WorkflowExecutionListItemDto | undefined): boolean =>
  !execution || TerminalExecutionStatuses.includes(execution.status);

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

/** The most recent execution of the workflow by anyone, polled while it is still running. */
export const useLastExecution = (api: WorkflowApi, workflowId: string, enabled: boolean) =>
  useQuery({
    queryKey: lastRunKey(workflowId),
    queryFn: async () => {
      const { results } = await api.getWorkflowExecutions(workflowId, {
        size: 1,
        sortField: 'createdAt',
        sortOrder: 'desc',
        omitStepRuns: true,
      });
      return results[0] ?? null;
    },
    enabled,
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: (execution) => (isTerminal(execution ?? undefined) ? false : POLL_INTERVAL_MS),
  });

/** Status of a run this viewer started, polled until it finishes. */
export const useOwnExecution = (api: WorkflowApi, executionId: string | undefined) =>
  useQuery({
    queryKey: ['dashboardRunPanel', 'execution', executionId ?? ''],
    queryFn: () => api.getExecution(executionId ?? '', { omitStepExecutions: true }),
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
    onSettled: () => queryClient.invalidateQueries({ queryKey: lastRunKey(workflowId) }),
  });
};
