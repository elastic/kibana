/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiPanel } from '@elastic/eui';
import React, { useCallback, useEffect, useMemo } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import {
  ResizableLayout,
  ResizableLayoutDirection,
  ResizableLayoutMode,
  ResizableLayoutOrder,
} from '@kbn/resizable-layout';
import { useWorkflowExecutionPolling } from '@kbn/workflows-ui';
import { WorkflowExecutionPanel } from './workflow_execution_panel';
import { WorkflowStepExecutionDetails } from './workflow_step_execution_details';
import { useWorkflowUrlState } from '../../../hooks/use_workflow_url_state';

const WidthStorageKey = 'WORKFLOWS_EXECUTION_DETAILS_WIDTH';
const DefaultSidebarWidth = 300;
export interface WorkflowExecutionDetailProps {
  executionId: string;
  onClose: () => void;
}

export const WorkflowExecutionDetail: React.FC<WorkflowExecutionDetailProps> = React.memo(
  ({ executionId, onClose }) => {
    const { workflowExecution, isLoading, error } = useWorkflowExecutionPolling(executionId);

    const { activeTab, setSelectedStepExecution, selectedStepExecutionId } = useWorkflowUrlState();
    const [sidebarWidth = DefaultSidebarWidth, setSidebarWidth] = useLocalStorage(
      WidthStorageKey,
      DefaultSidebarWidth
    );
    const showBackButton = activeTab === 'executions';

    useEffect(() => {
      if (workflowExecution && !selectedStepExecutionId) {
        // Auto-select the first step execution if none is selected
        const firstStepExecutionId = workflowExecution.stepExecutions?.[0]?.id;
        if (firstStepExecutionId) {
          setSelectedStepExecution(firstStepExecutionId);
        }
      }
    }, [workflowExecution, selectedStepExecutionId, setSelectedStepExecution]);

    const setSelectedStepExecutionId = useCallback(
      (stepExecutionId: string | null) => {
        setSelectedStepExecution(stepExecutionId);
      },
      [setSelectedStepExecution]
    );

    const workflowDefinition = useMemo(() => {
      if (workflowExecution) {
        return workflowExecution.workflowDefinition;
      }
      return null;
    }, [workflowExecution]);

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
            <WorkflowExecutionPanel
              definition={workflowDefinition}
              execution={workflowExecution ?? null}
              showBackButton={showBackButton}
              isLoading={isLoading}
              error={error}
              onClose={onClose}
              onStepExecutionClick={setSelectedStepExecutionId}
              selectedId={selectedStepExecutionId ?? null}
            />
          }
          fixedPanelSize={sidebarWidth}
          onFixedPanelSizeChange={setSidebarWidth}
          minFixedPanelSize={200}
          fixedPanelOrder={ResizableLayoutOrder.Start}
          flexPanel={
            <WorkflowStepExecutionDetails
              workflowExecutionId={executionId}
              stepExecution={selectedStepExecution}
              isLoading={isLoading}
            />
          }
          minFlexPanelSize={200}
          mode={ResizableLayoutMode.Resizable}
          direction={ResizableLayoutDirection.Horizontal}
          resizeButtonClassName="workflowExecutionDetailResizeButton"
          data-test-subj="WorkflowEditorWithExecutionDetailLayout"
          className="workflowExecutionDetailResizableLayout"
        />
      </EuiPanel>
    );
  }
);
WorkflowExecutionDetail.displayName = 'WorkflowExecutionDetail';
