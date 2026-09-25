/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useQueryClient } from '@kbn/react-query';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import type { JsonModelSchemaType } from '@kbn/workflows/spec/schema/common/json_model_schema';
import { useStepExecution } from './use_step_execution';
import type { ApprovalLabels } from '../ui/resume_execution_button';

export interface WaitingStepResume {
  waitingStepExecutionId: string | undefined;
  waitingStepStartedAt: string | undefined;
  resumeMessage: string | undefined;
  resumeSchema: JsonModelSchemaType | undefined;
  approvalLabels: ApprovalLabels | undefined;
  /** True when the waiting step is known but its input could not be fetched. */
  hasResumeError: boolean;
  retryResume: () => void;
}

/** Resolves the active waitForInput pause and its resume copy for Provide action / Approve–Reject. */
export function useWaitingStepResume(
  executionId: string,
  workflowExecution: WorkflowExecutionDto | null | undefined
): WaitingStepResume {
  const queryClient = useQueryClient();

  const waitingStep = useMemo(() => {
    if (
      !workflowExecution ||
      workflowExecution.id !== executionId ||
      workflowExecution.status !== ExecutionStatus.WAITING_FOR_INPUT
    ) {
      return undefined;
    }
    return workflowExecution.stepExecutions?.find(
      (step) => step.status === ExecutionStatus.WAITING_FOR_INPUT
    );
  }, [executionId, workflowExecution]);

  const waitingStepExecutionId = waitingStep?.id;
  const waitingStepStartedAt = waitingStep?.startedAt;

  const {
    data: pausedStepFullData,
    isLoading: isPausedStepLoading,
    isError: isPausedStepError,
    refetch: refetchPausedStep,
  } = useStepExecution(executionId, waitingStepExecutionId, ExecutionStatus.WAITING_FOR_INPUT);

  const hasResumeError = Boolean(waitingStepExecutionId && isPausedStepError);
  const retryResume = useCallback(() => {
    void refetchPausedStep();
  }, [refetchPausedStep]);

  const prevWaitingStepExecutionIdRef = useRef<string | undefined>();
  useEffect(() => {
    const previousWaitingStepExecutionId = prevWaitingStepExecutionIdRef.current;
    if (previousWaitingStepExecutionId && !waitingStepExecutionId) {
      // Execution left WAITING_FOR_INPUT — nudge full step I/O fetches so output
      // appears without a manual page refresh (same lazy-load path as waitForInput).
      void queryClient.invalidateQueries({ queryKey: ['stepExecution', executionId] });
    }
    prevWaitingStepExecutionIdRef.current = waitingStepExecutionId;
  }, [waitingStepExecutionId, executionId, queryClient]);

  return useMemo(() => {
    if (
      !waitingStepExecutionId ||
      isPausedStepLoading ||
      pausedStepFullData?.id !== waitingStepExecutionId
    ) {
      return {
        waitingStepExecutionId: undefined,
        waitingStepStartedAt: undefined,
        resumeMessage: undefined,
        resumeSchema: undefined,
        approvalLabels: undefined,
        hasResumeError,
        retryResume,
      };
    }

    const stepInput = pausedStepFullData?.input as
      | {
          message?: string;
          schema?: JsonModelSchemaType;
          approveLabel?: string;
          rejectLabel?: string;
        }
      | undefined;
    const labels =
      typeof stepInput?.approveLabel === 'string' && typeof stepInput?.rejectLabel === 'string'
        ? { approveLabel: stepInput.approveLabel, rejectLabel: stepInput.rejectLabel }
        : undefined;

    return {
      waitingStepExecutionId,
      waitingStepStartedAt,
      resumeMessage: stepInput?.message,
      resumeSchema: stepInput?.schema,
      approvalLabels: labels,
      hasResumeError,
      retryResume,
    };
  }, [
    hasResumeError,
    isPausedStepLoading,
    pausedStepFullData,
    retryResume,
    waitingStepExecutionId,
    waitingStepStartedAt,
  ]);
}
