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
import {
  DEFAULT_WAIT_FOR_APPROVAL_APPROVE_LABEL,
  DEFAULT_WAIT_FOR_APPROVAL_REJECT_LABEL,
  ExecutionStatus,
  getStepByNameFromNestedSteps,
} from '@kbn/workflows';
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

const approvalLabelsFrom = (approveLabel?: string, rejectLabel?: string): ApprovalLabels => ({
  approveLabel:
    typeof approveLabel === 'string' ? approveLabel : DEFAULT_WAIT_FOR_APPROVAL_APPROVE_LABEL,
  rejectLabel:
    typeof rejectLabel === 'string' ? rejectLabel : DEFAULT_WAIT_FOR_APPROVAL_REJECT_LABEL,
});

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
  const waitingStepType = waitingStep?.stepType;
  const waitingStepId = waitingStep?.stepId;
  const workflowSteps = workflowExecution?.workflowDefinition?.steps;

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
    const inputReady =
      Boolean(waitingStepExecutionId) &&
      !isPausedStepLoading &&
      pausedStepFullData?.id === waitingStepExecutionId;

    if (!inputReady) {
      if (waitingStepExecutionId && waitingStepType === 'waitForApproval') {
        const definitionStep =
          waitingStepId && workflowSteps
            ? getStepByNameFromNestedSteps(workflowSteps, waitingStepId)
            : null;
        const withConfig =
          definitionStep?.type === 'waitForApproval'
            ? (definitionStep.with as
                | {
                    message?: string;
                    approveLabel?: string;
                    rejectLabel?: string;
                  }
                | undefined)
            : undefined;

        return {
          waitingStepExecutionId,
          waitingStepStartedAt,
          resumeMessage: typeof withConfig?.message === 'string' ? withConfig.message : undefined,
          resumeSchema: undefined,
          approvalLabels: approvalLabelsFrom(withConfig?.approveLabel, withConfig?.rejectLabel),
          hasResumeError,
          retryResume,
        };
      }
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
    const stepType = pausedStepFullData?.stepType ?? waitingStepType;
    const isApproval =
      stepType === 'waitForApproval' ||
      typeof stepInput?.approveLabel === 'string' ||
      typeof stepInput?.rejectLabel === 'string';

    return {
      waitingStepExecutionId,
      waitingStepStartedAt,
      resumeMessage: stepInput?.message,
      resumeSchema: stepInput?.schema,
      approvalLabels: isApproval
        ? approvalLabelsFrom(stepInput?.approveLabel, stepInput?.rejectLabel)
        : undefined,
      hasResumeError,
      retryResume,
    };
  }, [
    hasResumeError,
    isPausedStepLoading,
    pausedStepFullData,
    retryResume,
    waitingStepExecutionId,
    waitingStepId,
    waitingStepStartedAt,
    waitingStepType,
    workflowSteps,
  ]);
}
