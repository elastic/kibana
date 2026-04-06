/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useQuery } from '@kbn/react-query';
import {
  WorkflowApi,
  type WorkflowExecutionLogEntry,
  type WorkflowExecutionLogsResponse,
} from '@kbn/workflows-ui';
import { useKibana } from '../../../hooks/use_kibana';

interface UseWorkflowExecutionLogsParams {
  executionId: string;
  stepExecutionId?: string;
  size?: number;
  page?: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  enabled?: boolean;
}

export function useWorkflowExecutionLogs({
  executionId,
  stepExecutionId,
  size = 100,
  page = 1,
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
      size,
      page,
      sortField,
      sortOrder,
    ],
    queryFn: async () => {
      const api = new WorkflowApi(http);
      return api.getExecutionLogs(executionId, {
        stepExecutionId,
        size,
        page,
        sortField,
        sortOrder,
      });
    },
    enabled: enabled && !!executionId,
    staleTime: 5000,
    refetchInterval: 5000,
  });
}

export type { WorkflowExecutionLogEntry, WorkflowExecutionLogsResponse };
