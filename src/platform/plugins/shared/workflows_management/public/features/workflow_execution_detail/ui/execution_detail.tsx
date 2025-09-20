/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useCallback } from 'react';

import type { EsWorkflowStepExecution } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import { useWorkflowExecution } from '../../../entities/workflows/model/use_workflow_execution';
import { WorkflowStepExecutionList } from './workflow_step_execution_list';
import { WorkflowStepExecutionFlyout } from './workflow_step_execution_flyout';

export interface ExecutionProps {
  workflowExecutionId: string;
  workflowYaml: string;
  fields?: Array<keyof EsWorkflowStepExecution>;
  setSelectedStepExecution: (stepExecutionId: string | null) => void;
  selectedStepExecutionId: string | undefined;
  setSelectedStep: (stepId: string | null) => void;
  onClose?: () => void;
}

export const ExecutionDetail: React.FC<ExecutionProps> = ({
  workflowExecutionId,
  setSelectedStepExecution,
  selectedStepExecutionId,
  setSelectedStep,
  onClose,
}) => {
  const {
    data: workflowExecution,
    isLoading,
    error,
    refetch,
  } = useWorkflowExecution(workflowExecutionId);

  const closeFlyout = useCallback(() => {
    setSelectedStepExecution(null);
  }, [setSelectedStepExecution]);

  useEffect(() => {
    if (!workflowExecution) {
      return;
    }

    const intervalId = setInterval(() => {
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

      clearInterval(intervalId);
    }, 500); // Refresh every 500ms

    return () => clearInterval(intervalId);
  }, [workflowExecution, refetch]);

  const renderSelectedStepExecutionFlyout = useCallback(() => {
    if (!workflowExecution?.stepExecutions?.length) {
      return null;
    }

    const selectedStepExecutionIndex = workflowExecution.stepExecutions.findIndex(
      (step) => step.id === selectedStepExecutionId
    );
    const selectedStepExecution = workflowExecution.stepExecutions[selectedStepExecutionIndex];

    if (!selectedStepExecution) {
      return null;
    }

    const goNext =
      selectedStepExecutionIndex < workflowExecution.stepExecutions.length - 1
        ? () => {
            const nextStepExecutionIndex =
              (selectedStepExecutionIndex + 1) % workflowExecution.stepExecutions.length;
            const nextStepExecution = workflowExecution.stepExecutions[nextStepExecutionIndex];
            setSelectedStepExecution(nextStepExecution.id);
          }
        : undefined;

    const goPrevious =
      selectedStepExecutionIndex > 0
        ? () => {
            const previousStepExecutionIndex =
              (selectedStepExecutionIndex - 1 + workflowExecution.stepExecutions.length) %
              workflowExecution.stepExecutions.length;
            const previousStepExecution =
              workflowExecution.stepExecutions[previousStepExecutionIndex];
            setSelectedStepExecution(previousStepExecution.id);
          }
        : undefined;

    return (
      <WorkflowStepExecutionFlyout
        workflowExecutionId={workflowExecutionId}
        stepExecutionId={selectedStepExecution.id}
        stepExecution={selectedStepExecution}
        closeFlyout={closeFlyout}
        goNext={goNext}
        goPrevious={goPrevious}
        setSelectedStepId={setSelectedStep}
        isLoading={isLoading}
      />
    );
  }, [
    workflowExecution?.stepExecutions,
    workflowExecutionId,
    closeFlyout,
    setSelectedStep,
    selectedStepExecutionId,
    setSelectedStepExecution,
    isLoading,
  ]);

  return (
    <>
      {renderSelectedStepExecutionFlyout()}
      <WorkflowStepExecutionList
        execution={workflowExecution ?? null}
        isLoading={isLoading}
        error={error as Error | null}
        onStepExecutionClick={(stepExecutionId) => {
          setSelectedStepExecution(stepExecutionId);
        }}
        onClose={onClose || (() => {})}
        selectedId={selectedStepExecutionId ?? null}
      />
    </>
  );
};
