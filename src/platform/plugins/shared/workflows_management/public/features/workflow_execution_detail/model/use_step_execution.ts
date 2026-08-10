/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useRef } from 'react';
import { useQuery } from '@kbn/react-query';
import type { ExecutionStatus } from '@kbn/workflows';
import { isTerminalStatus } from '@kbn/workflows';
import { useWorkflowsApi } from '@kbn/workflows-ui';
import { STEP_EXECUTION_POLL_INTERVAL_MS } from '../../../hooks/polling_constants';
import { useSerialPolling } from '../../../hooks/use_serial_polling';

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

  const query = useQuery({
    queryKey: ['stepExecution', workflowExecutionId, stepExecutionId],
    queryFn: async () => {
      if (!workflowExecutionId || !stepExecutionId) {
        throw new Error('Workflow execution ID and step execution ID are required');
      }
      return api.getStepExecution(workflowExecutionId, stepExecutionId);
    },
    enabled: !!workflowExecutionId && !!stepExecutionId,
    staleTime: isStepFinished ? Infinity : STEP_EXECUTION_POLL_INTERVAL_MS,
    refetchInterval: false,
  });

  const dataRef = useRef(query.data);
  dataRef.current = query.data;

  useSerialPolling({
    poll: () => query.refetch(),
    enabled: !!workflowExecutionId && !!stepExecutionId,
    immediate: false,
    intervalMs: STEP_EXECUTION_POLL_INTERVAL_MS,
    shouldStop: () => {
      const data = dataRef.current;
      return data !== undefined && isTerminalStatus(data.status);
    },
    pollKey: stepExecutionId,
  });

  return query;
}
