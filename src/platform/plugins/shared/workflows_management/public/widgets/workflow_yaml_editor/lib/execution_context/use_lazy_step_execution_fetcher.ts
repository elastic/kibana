/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useRef } from 'react';
import { useQueryClient } from '@kbn/react-query';
import type { EsWorkflowStepExecution } from '@kbn/workflows';
import { isTerminalStatus } from '@kbn/workflows';
import type { WorkflowStepExecutionDto } from '@kbn/workflows/types/v1';
import type { StepExecutionData } from './build_execution_context';
import { useKibana } from '../../../../hooks/use_kibana';

const STEP_EXECUTION_QUERY_KEY = 'stepExecution';

function toStepExecutionData(step: EsWorkflowStepExecution): StepExecutionData {
  return {
    output: step.output,
    error: step.error,
    input: step.input,
    status: step.status,
    state: step.state as StepExecutionData['state'],
  };
}

/**
 * Provides a stable ref to a function that lazily fetches a step execution's
 * I/O data. Checks the React Query cache first (shared with useStepExecution
 * in the execution detail panel); falls back to an HTTP request and populates
 * the cache so both directions stay in sync.
 *
 * The returned ref is updated every render so it always closes over the latest
 * execution ID and step executions, matching the ref-pattern used by the
 * Monaco hover provider.
 */
export function useLazyStepExecutionFetcher(
  executionId: string | undefined,
  stepExecutions: WorkflowStepExecutionDto[] | undefined
) {
  const { http } = useKibana().services;
  const queryClient = useQueryClient();

  const executionIdRef = useRef(executionId);
  executionIdRef.current = executionId;

  const stepExecutionsRef = useRef(stepExecutions);
  stepExecutionsRef.current = stepExecutions;

  const fetchRef = useRef<(stepId: string) => Promise<StepExecutionData | null>>(async () => null);

  fetchRef.current = async (stepId: string): Promise<StepExecutionData | null> => {
    const currentExecutionId = executionIdRef.current;
    if (!currentExecutionId) {
      return null;
    }

    const stepDocId = stepExecutionsRef.current?.find((s) => s.stepId === stepId)?.id;
    if (!stepDocId) {
      return null;
    }

    const queryKey = [STEP_EXECUTION_QUERY_KEY, currentExecutionId, stepDocId];
    const cached = queryClient.getQueryData<EsWorkflowStepExecution>(queryKey);

    // Only trust the cache for terminal steps — their data won't change.
    // Running steps need a fresh fetch since output may have appeared.
    const stepInfo = stepExecutionsRef.current?.find((s) => s.stepId === stepId);
    const isStepTerminal = stepInfo?.status && isTerminalStatus(stepInfo.status);

    if (cached && isStepTerminal) {
      return toStepExecutionData(cached);
    }

    try {
      const stepExecution = await http.get<EsWorkflowStepExecution>(
        `/api/workflowExecutions/${currentExecutionId}/steps/${stepDocId}`
      );
      if (!stepExecution) {
        return null;
      }
      queryClient.setQueryData(queryKey, stepExecution);
      return toStepExecutionData(stepExecution);
    } catch {
      return null;
    }
  };

  return fetchRef;
}
