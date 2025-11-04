/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from '../../../hooks/use_kibana';
interface WorkflowExecutionLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'debug' | 'warn' | 'error';
  message: string;
  stepId?: string;
  stepName?: string;
  connectorType?: string;
  duration?: number;
  additionalData?: Record<string, unknown>;
}

interface WorkflowExecutionLogsResponse {
  logs: WorkflowExecutionLogEntry[];
  total: number;
  limit: number;
  offset: number;
}

interface UseWorkflowExecutionLogsParams {
  executionId: string;
  stepExecutionId?: string;
  limit?: number;
  offset?: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  enabled?: boolean;
}

export function useWorkflowExecutionLogs({
  executionId,
  stepExecutionId,
  limit = 100,
  offset = 0,
  sortField = 'timestamp',
  sortOrder = 'desc',
  enabled = true,
}: UseWorkflowExecutionLogsParams) {
  const { http } = useKibana().services;

  return useQuery<WorkflowExecutionLogsResponse>({
    queryKey: [
      'workflowExecutionLogs',
      executionId,
      stepExecutionId,
      limit,
      offset,
      sortField,
      sortOrder,
    ],
    queryFn: async () => {
      const response = await http.get<WorkflowExecutionLogsResponse>(
        `/api/workflowExecutions/${executionId}/logs`,
        {
          query: {
            stepExecutionId,
            limit,
            offset,
            sortField,
            sortOrder,
          },
        }
      );
      return response;
    },
    enabled: enabled && !!executionId,
    staleTime: 5000, // Refresh every 5 seconds for real-time logs
    refetchInterval: 5000, // Auto-refresh logs
  });
}

export type { WorkflowExecutionLogEntry, WorkflowExecutionLogsResponse };
