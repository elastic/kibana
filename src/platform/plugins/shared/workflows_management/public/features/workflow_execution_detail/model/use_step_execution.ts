/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useQuery } from '@kbn/react-query';
import type { ExecutionStatus } from '@kbn/workflows';
import { isTerminalStatus } from '@kbn/workflows';
import { useWorkflowsApi } from '@kbn/workflows-ui';

const REFETCH_INTERVAL_MS = 5000;

/**
 * Fetches a single step execution with full data (input/output).
 * Polls while the step is still running, stops once it reaches a terminal status.
 */
export function useStepExecution(
  workflowExecutionId: string,
  stepExecutionId: string | undefined,
  stepStatus: ExecutionStatus | undefined
) {
  const api = useWorkflowsApi();
  const isStepFinished = stepStatus ? isTerminalStatus(stepStatus) : false;

  return useQuery({
    queryKey: ['stepExecution', workflowExecutionId, stepExecutionId],
    queryFn: async () => {
      if (!workflowExecutionId || !stepExecutionId) {
        throw new Error('Workflow execution ID and step execution ID are required');
      }
      return api.getStepExecution(workflowExecutionId, stepExecutionId);
    },
    enabled: !!workflowExecutionId && !!stepExecutionId,
    staleTime: isStepFinished ? Infinity : REFETCH_INTERVAL_MS, // will be cleared when switching to a different execution
    // Use the fetched data's own status to decide when to stop polling, rather than
    // relying solely on the lightweight polling status. This handles the case where
    // the execution polling already reports the step as finished, but ES hasn't
    // refreshed the full step document (with input/output) for the detailed fetch yet.
    refetchInterval: (data) => {
      if (data && isTerminalStatus(data.status)) {
        return false;
      }
      return REFETCH_INTERVAL_MS;
    },
  });
}
