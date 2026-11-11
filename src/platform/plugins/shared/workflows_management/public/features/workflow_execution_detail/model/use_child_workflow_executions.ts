/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo, useRef } from 'react';
import { useQuery } from '@kbn/react-query';
import type { ChildWorkflowExecutionItem, WorkflowExecutionDto } from '@kbn/workflows';
import { isExecuteSyncStepType, isTerminalStatus } from '@kbn/workflows';
import { useWorkflowsApi } from '@kbn/workflows-ui';
import { CHILD_WORKFLOW_EXECUTIONS_POLL_INTERVAL_MS } from '../../../hooks/polling_constants';
import { useSerialPolling } from '../../../hooks/use_serial_polling';

export type ChildWorkflowExecutionsMap = Map<string, ChildWorkflowExecutionItem>;

export function useChildWorkflowExecutions(
  parentExecution: WorkflowExecutionDto | undefined | null
): { childExecutions: ChildWorkflowExecutionsMap; isLoading: boolean } {
  const api = useWorkflowsApi();

  // Derive a key that changes whenever a workflow.execute step appears or changes status,
  // so react-query fetches the child run as it starts rather than on the next poll tick.
  const executeStepKey = useMemo(() => {
    if (!parentExecution?.stepExecutions) return '';
    return parentExecution.stepExecutions
      .filter((step) => isExecuteSyncStepType(step.stepType))
      .map((step) => `${step.id}:${step.status}`)
      .join(',');
  }, [parentExecution?.stepExecutions]);

  const parentExecutionRef = useRef(parentExecution);
  parentExecutionRef.current = parentExecution;

  const query = useQuery({
    queryKey: ['childWorkflowExecutions', parentExecution?.id, executeStepKey],
    queryFn: async (): Promise<ChildWorkflowExecutionsMap> => {
      const executionId = parentExecution?.id ?? '';
      const items = await api.getChildrenExecutions(executionId);
      const map: ChildWorkflowExecutionsMap = new Map();
      for (const item of items) {
        map.set(item.parentStepExecutionId, item);
      }
      return map;
    },
    enabled: !!parentExecution?.id,
    // Keep resolved children across executeStepKey changes, so a selected child step
    // is never briefly resolved against the parent execution.
    keepPreviousData: true,
    staleTime:
      parentExecution && isTerminalStatus(parentExecution.status)
        ? Infinity
        : CHILD_WORKFLOW_EXECUTIONS_POLL_INTERVAL_MS,
    refetchInterval: false,
  });

  useSerialPolling({
    poll: () => query.refetch(),
    enabled: !!parentExecution?.id,
    immediate: false,
    intervalMs: CHILD_WORKFLOW_EXECUTIONS_POLL_INTERVAL_MS,
    shouldStop: () => {
      const execution = parentExecutionRef.current;
      return execution !== undefined && execution !== null && isTerminalStatus(execution.status);
    },
    pollKey: parentExecution?.id,
  });

  return {
    childExecutions: query.data ?? new Map(),
    isLoading: query.isLoading,
  };
}
