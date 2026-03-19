/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import type {
  ExecutionStatus,
  WorkflowExecutionDto,
  WorkflowStepExecutionDto,
} from '@kbn/workflows';
import { isExecuteSyncStepType, isTerminalStatus } from '@kbn/workflows';
import { useKibana } from '../../../hooks/use_kibana';

export interface ChildWorkflowExecutionInfo {
  parentStepExecutionId: string;
  workflowId: string;
  workflowName: string;
  executionId: string;
  status: ExecutionStatus;
  stepExecutions: WorkflowStepExecutionDto[];
}

export type ChildWorkflowExecutionsMap = Map<string, ChildWorkflowExecutionInfo>;

export function useChildWorkflowExecutions(
  parentExecution: WorkflowExecutionDto | undefined | null
): { childExecutions: ChildWorkflowExecutionsMap; isLoading: boolean } {
  const { http } = useKibana().services;

  // Derive a key that changes when workflow.execute steps reach terminal status,
  // so react-query invalidates cached results and fetches newly available children.
  const terminalChildKey = useMemo(() => {
    if (!parentExecution?.stepExecutions) return '';
    return parentExecution.stepExecutions
      .filter((step) => isExecuteSyncStepType(step.stepType) && isTerminalStatus(step.status))
      .map((step) => step.id)
      .join(',');
  }, [parentExecution?.stepExecutions]);

  const { data, isLoading } = useQuery({
    queryKey: ['childWorkflowExecutions', parentExecution?.id, terminalChildKey],
    queryFn: async (): Promise<ChildWorkflowExecutionsMap> => {
      const executionId = parentExecution?.id ?? '';
      const items = await http.get<ChildWorkflowExecutionInfo[]>(
        `/api/workflowExecutions/${executionId}/childExecutions`
      );
      const map: ChildWorkflowExecutionsMap = new Map();
      for (const item of items) {
        map.set(item.parentStepExecutionId, item);
      }
      return map;
    },
    enabled: !!parentExecution?.id,
    staleTime: parentExecution && isTerminalStatus(parentExecution.status) ? Infinity : 5000,
    refetchInterval: parentExecution && isTerminalStatus(parentExecution.status) ? false : 5000,
  });

  return {
    childExecutions: data ?? new Map(),
    isLoading,
  };
}
