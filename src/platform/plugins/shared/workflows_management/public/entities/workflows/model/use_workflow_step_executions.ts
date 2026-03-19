/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useQuery } from '@kbn/react-query';
import type { EsWorkflowStepExecution } from '@kbn/workflows';
import { useKibana } from '../../../hooks/use_kibana';

export interface StepExecutionListResult {
  results: EsWorkflowStepExecution[];
  total: number;
  page?: number;
  size?: number;
}

interface UseWorkflowStepExecutionsParams {
  workflowId: string | null;
  stepId?: string | null;
  size?: number;
  page?: number;
}

export function useWorkflowStepExecutions(params: UseWorkflowStepExecutionsParams) {
  const { http } = useKibana().services;

  return useQuery({
    queryKey: [
      'workflows',
      params.workflowId,
      'step-executions',
      params.stepId,
      params.page,
      params.size,
    ],
    queryFn: async () => {
      if (!params.workflowId) {
        return { results: [], total: 0 };
      }
      return http.get<StepExecutionListResult>(
        `/api/workflowExecutions/${params.workflowId}/steps`,
        {
          query: {
            ...(params.stepId ? { stepId: params.stepId } : {}),
            page: params.page,
            size: params.size ?? 100,
          },
        }
      );
    },
    enabled: params.workflowId !== null,
  });
}
