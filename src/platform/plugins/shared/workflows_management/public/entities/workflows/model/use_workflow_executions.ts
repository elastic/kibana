/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ExecutionStatus, ExecutionType, WorkflowExecutionListDto } from '@kbn/workflows';
import { useQuery, type UseQueryOptions } from '@kbn/react-query';

interface UseWorkflowExecutionsParams {
  workflowId: string | null;
  statuses?: ExecutionStatus[];
  executionTypes?: ExecutionType[];
}

export function useWorkflowExecutions(
  params: UseWorkflowExecutionsParams,
  options: Omit<UseQueryOptions<WorkflowExecutionListDto>, 'queryKey' | 'queryFn'> = {}
) {
  const { http } = useKibana().services;

  return useQuery<WorkflowExecutionListDto>({
    networkMode: 'always',
    queryKey: [
      'workflows',
      params.workflowId,
      'executions',
      params.statuses,
      params.executionTypes,
    ],
    queryFn: () =>
      http!.get(`/api/workflowExecutions`, {
        query: {
          workflowId: params.workflowId,
          statuses: params.statuses,
          executionTypes: params.executionTypes,
        },
      }),
    enabled: params.workflowId !== null,
    ...options,
  });
}
