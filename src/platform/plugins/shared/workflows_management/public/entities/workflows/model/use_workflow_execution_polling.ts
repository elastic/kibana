/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useRef, useState } from 'react';
import { isTerminalStatus } from '@kbn/workflows';
import type { WorkflowExecutionDto } from '@kbn/workflows/types/latest';
import { WORKFLOW_EXECUTION_POLL_INTERVAL_MS } from '../../../hooks/polling_constants';
import { useAsyncThunkState } from '../../../hooks/use_async_thunk';
import { useSerialPolling } from '../../../hooks/use_serial_polling';
import { loadExecutionThunk } from '../store/workflow_detail/thunks/load_execution_thunk';

export interface PollingState {
  workflowExecution: WorkflowExecutionDto | undefined;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Polls a single workflow execution serially: each request starts only after the previous
 * finishes, then waits WORKFLOW_EXECUTION_POLL_INTERVAL_MS before the next poll.
 */
export const useWorkflowExecutionPolling = (workflowExecutionId: string): PollingState => {
  const [loadExecution, { result: workflowExecution, error }] =
    useAsyncThunkState(loadExecutionThunk);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const workflowExecutionIdRef = useRef(workflowExecutionId);
  workflowExecutionIdRef.current = workflowExecutionId;

  const workflowExecutionRef = useRef(workflowExecution);
  workflowExecutionRef.current = workflowExecution;

  useEffect(() => {
    setIsLoading(true);
  }, [workflowExecutionId]);

  useEffect(() => {
    if (workflowExecution?.id === workflowExecutionId) {
      setIsLoading(false);
    }
  }, [workflowExecution, workflowExecutionId]);

  useSerialPolling({
    poll: () => loadExecution({ id: workflowExecutionId }),
    pollKey: workflowExecutionId,
    intervalMs: WORKFLOW_EXECUTION_POLL_INTERVAL_MS,
    shouldStop: () => {
      const execution = workflowExecutionRef.current;
      return (
        execution !== undefined &&
        execution.id === workflowExecutionIdRef.current &&
        isTerminalStatus(execution.status)
      );
    },
  });

  return { workflowExecution, isLoading, error };
};
