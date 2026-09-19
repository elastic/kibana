/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useQuery } from '@kbn/react-query';
import { useWorkflowsApi } from '@kbn/workflows-ui';

/** Must stay at or below the executions logs route `MAX_PAGE_SIZE` (100). */
const STEP_EXECUTION_LOGS_PAGE_SIZE = 100;

/**
 * Loads workflow-engine logs for one step execution.
 * Same store as `context.logger` / `GET /api/workflows/executions/{id}/logs`.
 */
export function useStepExecutionLogs(
  workflowExecutionId: string,
  stepExecutionId: string | undefined,
  enabled: boolean
) {
  const api = useWorkflowsApi();

  return useQuery({
    queryKey: ['stepExecutionLogs', workflowExecutionId, stepExecutionId],
    queryFn: async () => {
      if (!workflowExecutionId || !stepExecutionId) {
        throw new Error('Workflow execution ID and step execution ID are required');
      }
      return api.getExecutionLogs(workflowExecutionId, {
        stepExecutionId,
        size: STEP_EXECUTION_LOGS_PAGE_SIZE,
        page: 1,
        sortField: 'timestamp',
        sortOrder: 'asc',
      });
    },
    enabled: enabled && !!workflowExecutionId && !!stepExecutionId,
    staleTime: 5_000,
  });
}
