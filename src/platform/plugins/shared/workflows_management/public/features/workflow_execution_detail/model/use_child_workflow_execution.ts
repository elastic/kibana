/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useQuery } from '@kbn/react-query';
import type { WorkflowExecutionDto } from '@kbn/workflows/types/latest';

/**
 * Hook to fetch a child workflow execution by ID
 */
export function useChildWorkflowExecution(executionId: string | null | undefined) {
  const { http } = useKibana().services;

  return useQuery({
    queryKey: ['childWorkflowExecution', executionId],
    queryFn: async () => {
      if (!executionId || !http) {
        return null;
      }
      const response = await http.get<WorkflowExecutionDto>(
        `/api/workflowExecutions/${executionId}`
      );
      return response;
    },
    enabled: !!executionId && !!http,
    staleTime: 5000, // Cache for 5 seconds
  });
}

/**
 * Hook to fetch multiple child workflow executions by their IDs
 */
export function useChildWorkflowExecutions(executionIds: string[]) {
  const { http } = useKibana().services;

  return useQuery({
    queryKey: ['childWorkflowExecutions', executionIds.sort().join(',')],
    queryFn: async () => {
      if (!executionIds.length || !http) {
        return new Map<string, WorkflowExecutionDto>();
      }

      // Fetch all child executions in parallel
      const results = await Promise.allSettled(
        executionIds.map((id) =>
          http.get<WorkflowExecutionDto>(`/api/workflowExecutions/${id}`).catch(() => {
            // Silently fail individual executions to avoid breaking the entire query
            return null;
          })
        )
      );

      const map = new Map<string, WorkflowExecutionDto>();
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          map.set(executionIds[index], result.value);
        }
      });

      return map;
    },
    enabled: executionIds.length > 0 && !!http,
    staleTime: 5000, // Cache for 5 seconds
  });
}
