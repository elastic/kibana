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
import { WorkflowExecutionPanel } from './workflow_execution_panel';
import {
  buildOverviewStepExecutionFromContext,
  buildTriggerStepExecutionFromContext,
} from './workflow_pseudo_step_context';
import { WorkflowStepExecutionDetails } from './workflow_step_execution_details';
import { useWorkflowExecutionPolling } from '../../../entities/workflows/model/use_workflow_execution_polling';
import { useWorkflowUrlState } from '../../../hooks/use_workflow_url_state';

const WidthStorageKey = 'WORKFLOWS_EXECUTION_DETAILS_WIDTH';
const DefaultSidebarWidth = 300;
export interface WorkflowExecutionDetailProps {
  executionId: string;
  onClose: () => void;
}

export const WorkflowExecutionDetail: React.FC<WorkflowExecutionDetailProps> = React.memo(
  ({ executionId, onClose }) => {
    const { workflowExecution, error } = useWorkflowExecutionPolling(executionId);

    const { activeTab, setSelectedStepExecution, selectedStepExecutionId } = useWorkflowUrlState();
    const [sidebarWidth = DefaultSidebarWidth, setSidebarWidth] = useLocalStorage(
      WidthStorageKey,
      DefaultSidebarWidth
    );
    const showBackButton = activeTab === 'executions';

    useEffect(() => {
      if (
        !selectedStepExecutionId && // no step execution selected
        executionId === workflowExecution?.id && // execution id matches (not stale execution used)
        workflowExecution?.stepExecutions?.length // step executions are loaded
      ) {
        setSelectedStepExecution('__overview');
      }
    }, [workflowExecution, selectedStepExecutionId, setSelectedStepExecution, executionId]);

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
      if (!selectedStepExecutionId) {
        return undefined;
      }

      if (selectedStepExecutionId === '__overview' && workflowExecution) {
        return buildOverviewStepExecutionFromContext(workflowExecution);
      }

      if (selectedStepExecutionId === 'trigger' && workflowExecution?.context) {
        return buildTriggerStepExecutionFromContext(workflowExecution) ?? undefined;
      }

      if (!workflowExecution?.stepExecutions?.length) {
        return undefined;
      }
      return workflowExecution.stepExecutions.find((step) => step.id === selectedStepExecutionId);
    }, [workflowExecution, selectedStepExecutionId]);

    return (
      <EuiPanel paddingSize="none" color="plain" hasShadow={false} style={{ height: '100%' }}>
        <ResizableLayout
          fixedPanel={
            <WorkflowExecutionPanel
              definition={workflowDefinition}
              execution={workflowExecution ?? null}
              showBackButton={showBackButton}
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
              workflowExecutionDuration={workflowExecution?.duration ?? undefined}
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
