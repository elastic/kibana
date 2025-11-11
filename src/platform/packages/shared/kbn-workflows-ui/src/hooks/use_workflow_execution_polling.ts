/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';
import { isTerminalStatus } from '@kbn/workflows';
import { useWorkflowExecution } from './use_workflow_execution';

export const PollingIntervalMs = 1000 as const;

export const useWorkflowExecutionPolling = (workflowExecutionId: string) => {
  const {
    data: workflowExecution,
    isLoading,
    error,
    refetch,
  } = useWorkflowExecution(workflowExecutionId);

  useEffect(() => {
    if (!workflowExecution) {
      return;
    }

    // Check if the execution is in a terminal state
    if (isTerminalStatus(workflowExecution.status)) {
      return;
    }

    // Use setInterval for continuous polling
    const intervalId = setInterval(() => {
      refetch();
    }, PollingIntervalMs);

    return () => clearInterval(intervalId);
  }, [refetch, workflowExecution]);

  return { workflowExecution, isLoading, error };
};
