/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useQuery } from '@kbn/react-query';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import { useKibana } from '../../../hooks/use_kibana';

interface UseWorkflowExecutionParams {
  executionId: string | null;
  enabled?: boolean;
  includeInput?: boolean;
  includeOutput?: boolean;
}

export function useWorkflowExecution({
  executionId,
  enabled = true,
  includeInput,
  includeOutput,
}: UseWorkflowExecutionParams) {
  const { http } = useKibana().services;

  return useQuery<WorkflowExecutionDto | null>({
    queryKey: ['workflowExecution', executionId, includeInput, includeOutput],
    queryFn: async () => {
      if (!executionId) return null;
      const query: Record<string, boolean> = {};
      if (includeInput != null) query.includeInput = includeInput;
      if (includeOutput != null) query.includeOutput = includeOutput;

      const response = await http.get<WorkflowExecutionDto>(
        `/api/workflowExecutions/${executionId}`,
        { query }
      );
      return response;
    },
    enabled: enabled && executionId !== null,
  });
}
