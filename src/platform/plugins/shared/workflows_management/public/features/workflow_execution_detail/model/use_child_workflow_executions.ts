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
import { isTerminalStatus } from '@kbn/workflows';
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

interface WorkflowExecuteStepRef {
  stepExecutionId: string;
  childExecutionId: string;
}

/**
 * Fetches child workflow execution data for all `workflow.execute` steps.
 *
 * The child executionId is available in the step's `state` field (set by the
 * workflow.execute runner), so no extra per-step fetch is needed.
 *
 * Returns a map of parentStepExecutionId -> child execution info.
 */
export function useChildWorkflowExecutions(
  parentExecution: WorkflowExecutionDto | undefined | null
): { childExecutions: ChildWorkflowExecutionsMap; isLoading: boolean } {
  const { http } = useKibana().services;

  const workflowExecuteStepRefs = useMemo((): WorkflowExecuteStepRef[] => {
    if (!parentExecution?.stepExecutions) return [];
    return parentExecution.stepExecutions
      .filter((step) => step.stepType === 'workflow.execute' && isTerminalStatus(step.status))
      .map((step) => {
        const state = step.state as Record<string, unknown> | undefined;
        const childExecutionId = state?.executionId;
        if (typeof childExecutionId !== 'string') return null;
        return { stepExecutionId: step.id, childExecutionId };
      })
      .filter((ref): ref is WorkflowExecuteStepRef => ref !== null);
  }, [parentExecution?.stepExecutions]);

  const stableKey = useMemo(
    () => workflowExecuteStepRefs.map((r) => r.childExecutionId).join(','),
    [workflowExecuteStepRefs]
  );

  const { data, isLoading } = useQuery({
    queryKey: ['childWorkflowExecutions', parentExecution?.id, stableKey],
    queryFn: async (): Promise<ChildWorkflowExecutionsMap> => {
      const results: ChildWorkflowExecutionsMap = new Map();

      const childExecutions = await Promise.all(
        workflowExecuteStepRefs.map(async (ref) => {
          const childExecution = await http.get<WorkflowExecutionDto>(
            `/api/workflowExecutions/${ref.childExecutionId}`,
            { query: { includeInput: false, includeOutput: false } }
          );
          return { parentStepExecutionId: ref.stepExecutionId, childExecution };
        })
      );

      for (const { parentStepExecutionId, childExecution } of childExecutions) {
        const name = childExecution.workflowName ?? childExecution.workflowDefinition?.name ?? '';
        results.set(parentStepExecutionId, {
          parentStepExecutionId,
          workflowId: childExecution.workflowId ?? '',
          workflowName: name,
          executionId: childExecution.id,
          status: childExecution.status,
          stepExecutions: childExecution.stepExecutions,
        });
      }

      return results;
    },
    enabled: workflowExecuteStepRefs.length > 0,
    staleTime: parentExecution && isTerminalStatus(parentExecution.status) ? Infinity : 5000,
    refetchInterval: parentExecution && isTerminalStatus(parentExecution.status) ? false : 5000,
  });

  return {
    childExecutions: data ?? new Map(),
    isLoading,
  };
}
