/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useQuery } from '@kbn/react-query';
import type { EsWorkflowStepExecution, ExecutionStatus } from '@kbn/workflows';
import { isTerminalStatus } from '@kbn/workflows';
import { useKibana } from '../../../hooks/use_kibana';

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
  const { http } = useKibana().services;
  const isStepFinished = stepStatus ? isTerminalStatus(stepStatus) : false;

  return useQuery({
    queryKey: ['stepExecution', workflowExecutionId, stepExecutionId],
    queryFn: async () => {
      const response = await http.get<EsWorkflowStepExecution>(
        `/api/workflowExecutions/${workflowExecutionId}/steps/${stepExecutionId}`
      );
      return response;
    },
    enabled: !!workflowExecutionId && !!stepExecutionId,
    staleTime: isStepFinished ? Infinity : REFETCH_INTERVAL_MS, // will be cleared when switching to a different execution
    refetchInterval: isStepFinished ? false : REFETCH_INTERVAL_MS,
  });
}
