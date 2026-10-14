/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux-v7';
import { isTerminalStatus } from '@kbn/workflows';
import type { WorkflowExecutionDto } from '@kbn/workflows/types/latest';
import { WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE } from '../../../../common';
import {
  LARGE_WORKFLOW_EXECUTION_POLL_INTERVAL_MS,
  WORKFLOW_EXECUTION_POLL_INTERVAL_MS,
} from '../../../hooks/polling_constants';
import { useSerialPolling } from '../../../hooks/use_serial_polling';
import type { AppDispatch } from '../store/store';
import type { RootState } from '../store/types';
import { selectExecution, selectExecutionError } from '../store/workflow_detail/selectors';
import { cancelExecutionLoading } from '../store/workflow_detail/slice';
import { loadExecutionThunk } from '../store/workflow_detail/thunks/load_execution_thunk';

export interface PollingState {
  workflowExecution: WorkflowExecutionDto | undefined;
  isLoading: boolean;
  error: Error | null;
}

/** Polls the selected execution through the same Redux loader used by Show more. */
export const useWorkflowExecutionPolling = (workflowExecutionId: string): PollingState => {
  const dispatch = useDispatch<AppDispatch>();
  const store = useStore<RootState>();
  const execution = useSelector(selectExecution);
  const executionError = useSelector(selectExecutionError);
  const workflowExecution = execution?.id === workflowExecutionId ? execution : undefined;
  const error = useMemo(
    () => (executionError?.id === workflowExecutionId ? new Error(executionError.message) : null),
    [executionError, workflowExecutionId]
  );

  useEffect(() => {
    return () => {
      dispatch(cancelExecutionLoading(workflowExecutionId));
    };
  }, [dispatch, workflowExecutionId]);

  useSerialPolling({
    poll: async () => {
      await dispatch(loadExecutionThunk({ id: workflowExecutionId }));
    },
    pollKey: workflowExecutionId,
    intervalMs: () => {
      const { execution: currentExecution, stepExecutionsTotal } = store.getState().detail;
      return currentExecution?.id === workflowExecutionId &&
        stepExecutionsTotal > WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE
        ? LARGE_WORKFLOW_EXECUTION_POLL_INTERVAL_MS
        : WORKFLOW_EXECUTION_POLL_INTERVAL_MS;
    },
    shouldStop: () => {
      const { execution: currentExecution, executionRequest } = store.getState().detail;
      return (
        !executionRequest &&
        currentExecution?.id === workflowExecutionId &&
        isTerminalStatus(currentExecution.status)
      );
    },
  });

  return { workflowExecution, isLoading: !workflowExecution && !error, error };
};
