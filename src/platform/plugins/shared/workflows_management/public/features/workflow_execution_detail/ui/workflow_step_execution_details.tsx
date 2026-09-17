/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type {
  ChildWorkflowExecutionItem,
  WorkflowStepExecutionDto,
  WorkflowTokenUsage,
} from '@kbn/workflows';
import { ExecutionStatus, isTerminalStatus } from '@kbn/workflows';
import type { JsonModelSchemaType } from '@kbn/workflows/spec/schema/common/json_model_schema';
import { ForeachIterationsSection } from './foreach_iterations_section';
import { NestedWorkflowExecutionLinks } from './nested_workflow_execution_links';
import { type ApprovalLabels, ResumeExecutionButton } from './resume_execution_button';
import { StepExecutionDataView } from './step_execution_data_view';
import { WorkflowExecutionOverview } from './workflow_execution_overview';
import type { WorkflowExecutionLinkInfo } from '../../../hooks/navigation/use_navigate_to_execution';

interface WorkflowStepExecutionDetailsProps {
  workflowExecutionId: string;
  stepExecution?: WorkflowStepExecutionDto;
  allStepExecutions?: WorkflowStepExecutionDto[];
  workflowExecutionDuration?: number;
  /** Aggregated token usage across all `ai.*` steps, shown on the overview pseudo-step. */
  workflowExecutionUsage?: WorkflowTokenUsage;
  isLoadingStepData?: boolean;
  workflowExecutionStatus?: ExecutionStatus;
  resumeMessage?: string;
  resumeSchema?: JsonModelSchemaType;
  approvalLabels?: ApprovalLabels;
  shouldAutoResume?: boolean;
  waitingStepExecutionId?: string;
  /** When the step is workflow.execute, the child workflow execution (to link to) */
  childWorkflowExecution?: ChildWorkflowExecutionItem;
  /** When viewing a step that belongs to a nested execution, the parent workflow execution (to link to) */
  parentWorkflowExecution?: WorkflowExecutionLinkInfo;
  onSelectStepExecution?: (stepExecutionId: string) => void;
}

export const WorkflowStepExecutionDetails = React.memo<WorkflowStepExecutionDetailsProps>(
  ({
    workflowExecutionId,
    stepExecution,
    allStepExecutions,
    workflowExecutionDuration,
    workflowExecutionUsage,
    isLoadingStepData,
    workflowExecutionStatus,
    resumeMessage,
    resumeSchema,
    approvalLabels,
    shouldAutoResume = false,
    waitingStepExecutionId,
    childWorkflowExecution,
    parentWorkflowExecution,
    onSelectStepExecution,
  }) => {
    const isWaitingForInput = stepExecution?.status === ExecutionStatus.WAITING_FOR_INPUT;

    // Show data for terminal steps OR steps paused for input (they have input but no output yet)
    const isFinished = useMemo(
      () =>
        Boolean(stepExecution?.status && isTerminalStatus(stepExecution.status)) ||
        isWaitingForInput,
      [stepExecution?.status, isWaitingForInput]
    );

    const isOverviewPseudoStep = stepExecution?.stepType === '__overview';
    const isTriggerPseudoStep = stepExecution?.stepType?.startsWith('trigger_');

    // Extract trigger type from stepType (e.g., 'trigger_manual' -> 'manual')
    const triggerType = isTriggerPseudoStep
      ? stepExecution?.stepType?.replace('trigger_', '')
      : undefined;

    const hasInput = Boolean(stepExecution?.input);
    const hasOutput = Boolean(stepExecution?.output);
    const hasError = Boolean(stepExecution?.error);
    const isForeachOrWhile =
      stepExecution?.stepType === 'foreach' || stepExecution?.stepType === 'while';

    // Detect foreach/while children even when stepType is absent from the lightweight poll.
    const hasForeachIterations = useMemo(() => {
      const stepId = stepExecution?.stepId;
      if (!stepId || !allStepExecutions?.length || !onSelectStepExecution) {
        return false;
      }
      return allStepExecutions.some((s) => {
        const frame = s.scopeStack.find((f) => f.stepId === stepId);
        return frame?.nestedScopes.some((sc) => sc.scopeId !== undefined) ?? false;
      });
    }, [stepExecution?.stepId, allStepExecutions, onSelectStepExecution]);

    const showInput = hasInput;
    const showIterations =
      (isForeachOrWhile || hasForeachIterations) &&
      Boolean(onSelectStepExecution) &&
      Boolean(allStepExecutions?.length);
    const showOutput = hasOutput || hasError;

    if (!stepExecution) {
      return (
        <EuiPanel hasShadow={false} paddingSize="m">
          <EuiSkeletonText lines={1} />
          <EuiSpacer size="l" />
          <EuiSkeletonText lines={4} />
        </EuiPanel>
      );
    }

    if (isOverviewPseudoStep) {
      return (
        <WorkflowExecutionOverview
          stepExecution={stepExecution}
          workflowExecutionDuration={workflowExecutionDuration}
          workflowExecutionUsage={workflowExecutionUsage}
          showResumeUI={
            workflowExecutionStatus === ExecutionStatus.WAITING_FOR_INPUT &&
            Boolean(waitingStepExecutionId)
          }
          executionId={workflowExecutionId}
          resumeMessage={resumeMessage}
          resumeSchema={resumeSchema}
          approvalLabels={approvalLabels}
          shouldAutoResume={shouldAutoResume}
          waitingStepExecutionId={waitingStepExecutionId}
        />
      );
    }

    return (
      <EuiPanel
        hasShadow={false}
        paddingSize="m"
        css={{ height: '100%', paddingTop: '13px' /* overrides EuiPanel's paddingTop */ }}
        data-test-subj={
          isTriggerPseudoStep ? 'workflowExecutionTrigger' : 'workflowStepExecutionDetails'
        }
      >
        <EuiFlexGroup
          direction="column"
          gutterSize="m"
          css={{ height: '100%', overflow: 'hidden' }}
        >
          {(childWorkflowExecution || parentWorkflowExecution) && (
            <EuiFlexItem grow={false}>
              <NestedWorkflowExecutionLinks
                stepExecution={stepExecution}
                childWorkflowExecution={childWorkflowExecution}
                parentWorkflowExecution={parentWorkflowExecution}
              />
            </EuiFlexItem>
          )}
          {isFinished ? (
            <EuiFlexItem css={{ overflowY: 'auto' }}>
              {isLoadingStepData ? (
                <EuiPanel hasShadow={false} paddingSize="m">
                  <EuiSkeletonText lines={4} />
                </EuiPanel>
              ) : (
                <EuiFlexGroup direction="column" gutterSize="m">
                  {showInput && (
                    <EuiFlexItem grow={false}>
                      {isWaitingForInput && (
                        <>
                          <ResumeExecutionButton
                            executionId={workflowExecutionId}
                            workflowId={stepExecution?.workflowId}
                            stepStartedAt={stepExecution?.startedAt}
                            resumeMessage={resumeMessage}
                            resumeSchema={resumeSchema}
                            approvalLabels={approvalLabels}
                            autoOpen={shouldAutoResume}
                            waitingStepExecutionId={stepExecution?.id}
                          />
                          <EuiSpacer size="m" />
                        </>
                      )}
                      {isTriggerPseudoStep && (
                        <>
                          <EuiCallOut
                            size="s"
                            title={i18n.translate(
                              'workflowsManagement.stepExecutionDetails.inputAccessTitle',
                              {
                                defaultMessage: 'Access this data in your workflow',
                              }
                            )}
                            iconType="info"
                            announceOnMount={false}
                          >
                            <FormattedMessage
                              id="workflowsManagement.stepExecutionDetails.inputAccessDescription"
                              defaultMessage="You can reference these values using {code}"
                              values={{
                                code: (
                                  <strong>
                                    {triggerType === 'manual'
                                      ? `{{ inputs.<field> }}`
                                      : `{{ event.<field> }}`}
                                  </strong>
                                ),
                              }}
                            />
                          </EuiCallOut>
                          <EuiSpacer size="m" />
                        </>
                      )}
                      <StepExecutionDataView stepExecution={stepExecution} mode="input" />
                    </EuiFlexItem>
                  )}
                  {showIterations &&
                    stepExecution &&
                    allStepExecutions &&
                    onSelectStepExecution && (
                      <EuiFlexItem grow={false}>
                        <ForeachIterationsSection
                          foreachStep={stepExecution}
                          allStepExecutions={allStepExecutions}
                          selectedId={stepExecution.id}
                          onSelectStep={onSelectStepExecution}
                          executionStatus={workflowExecutionStatus}
                        />
                      </EuiFlexItem>
                    )}
                  {showOutput && (
                    <EuiFlexItem grow={false}>
                      <StepExecutionDataView
                        stepExecution={stepExecution}
                        mode="output"
                        allStepExecutions={allStepExecutions}
                      />
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
              )}
            </EuiFlexItem>
          ) : (
            <EuiLoadingSpinner size="m" />
          )}
        </EuiFlexGroup>
      </EuiPanel>
    );
  }
);
WorkflowStepExecutionDetails.displayName = 'WorkflowStepExecutionDetails';
