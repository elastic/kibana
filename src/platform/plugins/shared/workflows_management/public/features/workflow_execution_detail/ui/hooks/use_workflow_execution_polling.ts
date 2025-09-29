/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';
import { ExecutionStatus } from '@kbn/workflows';
import { useWorkflowExecution } from '../../../../entities/workflows/model/use_workflow_execution';

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

    const timeoutId = setTimeout(() => {
      if (
        ![
          ExecutionStatus.COMPLETED,
          ExecutionStatus.FAILED,
          ExecutionStatus.CANCELLED,
          ExecutionStatus.SKIPPED,
        ].includes(workflowExecution.status)
      ) {
        refetch();
        return;
      }

      clearTimeout(timeoutId);
    }, 500); // Refresh every 500ms

    return () => clearTimeout(timeoutId);
  }, [workflowExecution, refetch]);

  return { workflowExecution, isLoading, error };
};
