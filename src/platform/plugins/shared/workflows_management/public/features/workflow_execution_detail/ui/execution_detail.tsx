/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo } from 'react';

import type { EsWorkflowStepExecution } from '@kbn/workflows';
import { EuiPanel } from '@elastic/eui';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import {
  ResizableLayout,
  ResizableLayoutDirection,
  ResizableLayoutMode,
  ResizableLayoutSide,
} from '@kbn/resizable-layout';
import { WorkflowStepExecutionList } from './workflow_step_execution_list';
import { WorkflowStepExecutionDetails } from './workflow_step_execution_details';
import { useWorkflowExecutionPolling } from './hooks/use_workflow_execution_polling';

const WidthStorageKey = 'WORKFLOWS_EXECUTION_DETAILS_WIDTH';
const DefaultSidebarWidth = 300;
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

  const [sidebarWidth = DefaultSidebarWidth, setSidebarWidth] = useLocalStorage(
    WidthStorageKey,
    DefaultSidebarWidth
  );

  const setSelectedStepExecutionId = useCallback(
    (stepExecutionId: string | null) => {
      setSelectedStepExecution(stepExecutionId);
    },
    [setSelectedStepExecution]
  );

  useEffect(() => {
    if (workflowExecution && !selectedStepExecutionId) {
      // Auto-select the first step execution if none is selected
      const firstStepExecutionId = workflowExecution.stepExecutions?.[0]?.id;
      if (firstStepExecutionId) {
        setSelectedStepExecution(firstStepExecutionId);
      }
    }
  }, [workflowExecution, selectedStepExecutionId, setSelectedStepExecution]);

  const selectedStepExecution = useMemo(() => {
    if (!workflowExecution?.stepExecutions?.length || !selectedStepExecutionId) {
      return undefined;
    }
    return workflowExecution.stepExecutions.find((step) => step.id === selectedStepExecutionId);
  }, [workflowExecution?.stepExecutions, selectedStepExecutionId]);

  return (
    <EuiPanel paddingSize="none" color="plain" hasShadow={false} style={{ height: '100%' }}>
      <ResizableLayout
        fixedPanel={
          <WorkflowStepExecutionList
            execution={workflowExecution ?? null}
            isLoading={isLoading}
            error={error}
            onClose={onClose}
            onStepExecutionClick={setSelectedStepExecutionId}
            selectedId={selectedStepExecutionId ?? null}
          />
        }
        fixedPanelSize={sidebarWidth}
        onFixedPanelSizeChange={setSidebarWidth}
        minFixedPanelSize={150}
        fixedPanelSide={ResizableLayoutSide.Left}
        flexPanel={
          <WorkflowStepExecutionDetails
            workflowExecutionId={workflowExecutionId}
            stepExecution={selectedStepExecution}
            setSelectedStepId={setSelectedStep}
            isLoading={isLoading}
          />
        }
        minFlexPanelSize={250}
        mode={ResizableLayoutMode.Resizable}
        direction={ResizableLayoutDirection.Horizontal}
        resizeButtonClassName="workflowExecutionDetailResizeButton"
        data-test-subj="WorkflowEditorWithExecutionDetailLayout"
        className="workflowExecutionDetailResizableLayout"
      />
    </EuiPanel>
  );
};
