/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';

import type { EsWorkflowStepExecution } from '@kbn/workflows';
import { EuiPanel, EuiResizableContainer } from '@elastic/eui';
import { WorkflowStepExecutionList } from './workflow_step_execution_list';
import { WorkflowStepExecutionDetails } from './workflow_step_execution_details';
import { useWorkflowExecutionPolling } from './hooks/use_workflow_execution_polling';

export interface ExecutionDetailsProps {
  workflowExecutionId: string;
  workflowYaml: string;
  fields?: Array<keyof EsWorkflowStepExecution>;
  setSelectedStepExecution: (stepExecutionId: string | null) => void;
  selectedStepExecutionId: string | undefined;
  setSelectedStep: (stepId: string | null) => void;
  onClose: () => void;
}

export const ExecutionDetail: React.FC<ExecutionDetailsProps> = ({
  workflowExecutionId,
  setSelectedStepExecution,
  selectedStepExecutionId,
  setSelectedStep,
  onClose,
}) => {
  const { workflowExecution, isLoading, error } = useWorkflowExecutionPolling(workflowExecutionId);

  const setSelectedStepExecutionId = useCallback(
    (stepExecutionId: string | null) => {
      setSelectedStepExecution(stepExecutionId);
    },
    [setSelectedStepExecution]
  );

  const closeDetails = useCallback(() => {
    setSelectedStepExecution(null);
  }, [setSelectedStepExecution]);

  const selectedStepExecution = useMemo(() => {
    if (!workflowExecution?.stepExecutions?.length || !selectedStepExecutionId) {
      return null;
    }
    return workflowExecution.stepExecutions.find((step) => step.id === selectedStepExecutionId);
  }, [workflowExecution?.stepExecutions, selectedStepExecutionId]);

  return (
    <EuiPanel paddingSize="none" color="plain" hasShadow={false} style={{ height: '100%' }}>
      {selectedStepExecution ? (
        <EuiResizableContainer
          data-test-subj="workflowExecutionDetailContainer"
          style={{ height: '100%' }}
        >
          {(EuiResizablePanel, EuiResizableButton) => (
            <>
              <EuiResizablePanel
                initialSize={50}
                minSize="300px"
                tabIndex={0}
                paddingSize="none"
                color="plain"
              >
                <WorkflowStepExecutionList
                  execution={workflowExecution ?? null}
                  isLoading={isLoading}
                  error={error}
                  onClose={onClose}
                  onStepExecutionClick={setSelectedStepExecutionId}
                  selectedId={selectedStepExecutionId ?? null}
                />
              </EuiResizablePanel>

              <EuiResizableButton indicator="border" />

              <EuiResizablePanel
                initialSize={50}
                minSize="300px"
                tabIndex={0}
                paddingSize="none"
                color="plain"
              >
                <WorkflowStepExecutionDetails
                  workflowExecutionId={workflowExecutionId}
                  stepExecution={selectedStepExecution}
                  onClose={closeDetails}
                  setSelectedStepId={setSelectedStep}
                  isLoading={isLoading}
                />
              </EuiResizablePanel>
            </>
          )}
        </EuiResizableContainer>
      ) : (
        <WorkflowStepExecutionList
          execution={workflowExecution ?? null}
          isLoading={isLoading}
          error={error}
          onClose={onClose}
          onStepExecutionClick={setSelectedStepExecutionId}
          selectedId={selectedStepExecutionId ?? null}
        />
      )}
    </EuiPanel>
  );
};
