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
import { useChildWorkflowExecution } from '../model/use_child_workflow_execution';

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

    // Check if selected step is a child step (prefixed with "child::")
    const isChildStep = useMemo(() => {
      return selectedStepExecutionId?.startsWith('child::') ?? false;
    }, [selectedStepExecutionId]);

    // Extract child execution ID and step execution ID from prefixed ID
    // Handles both single-level and multi-level nesting:
    // - Single: child::${childExecutionId}::${stepExecutionId}
    // - Nested: child::${parentChildId}::child::${subChildId}::${stepExecutionId}
    const { childExecutionId, actualStepExecutionId } = useMemo(() => {
      if (!isChildStep || !selectedStepExecutionId) {
        return { childExecutionId: null, actualStepExecutionId: null };
      }
      // Split by '::' and parse the structure
      const parts = selectedStepExecutionId.split('::');
      if (parts.length >= 3 && parts[0] === 'child') {
        // Find the last occurrence of 'child' to determine the deepest level
        // The pattern is: child::execId::child::execId::...::stepId
        let lastChildIndex = 0;
        for (let i = 0; i < parts.length; i += 2) {
          if (parts[i] === 'child') {
            lastChildIndex = i;
          } else {
            break;
          }
        }
        // The execution ID is always after 'child'
        // The step execution ID is the last part
        const deepestChildExecutionId = parts[lastChildIndex + 1];
        const stepExecutionId = parts[parts.length - 1];
        return {
          childExecutionId: deepestChildExecutionId,
          actualStepExecutionId: stepExecutionId,
        };
      }
      return { childExecutionId: null, actualStepExecutionId: null };
    }, [isChildStep, selectedStepExecutionId]);

    // Fetch child execution if needed
    const { data: childExecution, isLoading: isLoadingChildExecution } =
      useChildWorkflowExecution(childExecutionId);

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

      // Handle child step selection
      // Only return the step if child execution is loaded (not loading)
      if (isChildStep) {
        if (isLoadingChildExecution) {
          // Return undefined while loading to show loading state
          return undefined;
        }
        if (childExecution && actualStepExecutionId) {
          // Handle pseudo-steps for child executions (Overview, Inputs, Trigger)
          if (actualStepExecutionId === '__overview') {
            return buildOverviewStepExecutionFromContext(childExecution);
          }
          if (
            actualStepExecutionId === '__pseudo_inputs__' ||
            actualStepExecutionId === '__pseudo_trigger__' ||
            actualStepExecutionId === 'trigger'
          ) {
            return buildTriggerStepExecutionFromContext(childExecution) ?? undefined;
          }
          // For regular steps, find in child execution's step executions
          return childExecution.stepExecutions?.find((step) => step.id === actualStepExecutionId);
        }
        // If child execution failed to load or step not found, return undefined
        return undefined;
      }

      if (!workflowExecution?.stepExecutions?.length) {
        return undefined;
      }
      return workflowExecution.stepExecutions.find((step) => step.id === selectedStepExecutionId);
    }, [
      workflowExecution,
      selectedStepExecutionId,
      isChildStep,
      childExecution,
      actualStepExecutionId,
      isLoadingChildExecution,
    ]);

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
              workflowExecutionId={isChildStep && childExecutionId ? childExecutionId : executionId}
              stepExecution={selectedStepExecution}
              workflowExecutionDuration={
                isChildStep && childExecution
                  ? childExecution.duration ?? undefined
                  : workflowExecution?.duration ?? undefined
              }
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
