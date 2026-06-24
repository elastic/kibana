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
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { hasActiveModifierKey } from '@kbn/shared-ux-utility';
import type { ChildWorkflowExecutionItem, WorkflowStepExecutionDto } from '@kbn/workflows';
import { ExecutionStatus, isExecuteSyncStepType, isTerminalStatus } from '@kbn/workflows';
import type { JsonModelSchemaType } from '@kbn/workflows/spec/schema/common/json_model_schema';
import { ResumeExecutionButton } from './resume_execution_button';
import { StepExecutionDataView } from './step_execution_data_view';
import { WorkflowExecutionOverview } from './workflow_execution_overview';
import type { WorkflowExecutionLinkInfo } from '../../../hooks/navigation/use_navigate_to_execution';
import { useNavigateToExecution } from '../../../hooks/navigation/use_navigate_to_execution';
import { getExecutionStatusIcon } from '../../../shared/ui/status_badge';

interface WorkflowStepExecutionDetailsProps {
  workflowExecutionId: string;
  stepExecution?: WorkflowStepExecutionDto;
  allStepExecutions?: WorkflowStepExecutionDto[];
  workflowExecutionDuration?: number;
  isLoadingStepData?: boolean;
  workflowExecutionStatus?: ExecutionStatus;
  resumeMessage?: string;
  resumeSchema?: JsonModelSchemaType;
  shouldAutoResume?: boolean;
  waitingStepExecutionId?: string;
  /** When the step is workflow.execute, the child workflow execution (to link to) */
  childWorkflowExecution?: ChildWorkflowExecutionItem;
  /** When viewing a step that belongs to a nested execution, the parent workflow execution (to link to) */
  parentWorkflowExecution?: WorkflowExecutionLinkInfo;
}

export const WorkflowStepExecutionDetails = React.memo<WorkflowStepExecutionDetailsProps>(
  ({
    workflowExecutionId,
    stepExecution,
    allStepExecutions,
    workflowExecutionDuration,
    isLoadingStepData,
    workflowExecutionStatus,
    resumeMessage,
    resumeSchema,
    shouldAutoResume = false,
    waitingStepExecutionId,
    childWorkflowExecution,
    parentWorkflowExecution,
  }) => {
    const { euiTheme } = useEuiTheme();
    const workflowNav = useNavigateToExecution(
      childWorkflowExecution
        ? {
            workflowId: childWorkflowExecution.workflowId,
            executionId: childWorkflowExecution.executionId,
          }
        : { workflowId: '' }
    );
    const parentWorkflowNav = useNavigateToExecution(
      parentWorkflowExecution
        ? {
            workflowId: parentWorkflowExecution.workflowId,
            executionId: parentWorkflowExecution.executionId,
          }
        : { workflowId: '' }
    );

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
    const isWorkflowExecuteStep = isExecuteSyncStepType(stepExecution?.stepType);

    const handleWorkflowLinkClick = useCallback(
      (e: React.MouseEvent) => {
        if (hasActiveModifierKey(e)) return;
        if (childWorkflowExecution) {
          e.preventDefault();
          workflowNav.navigate();
        }
      },
      [childWorkflowExecution, workflowNav]
    );

    const handleParentWorkflowLinkClick = useCallback(
      (e: React.MouseEvent) => {
        if (hasActiveModifierKey(e)) return;
        if (parentWorkflowExecution) {
          e.preventDefault();
          parentWorkflowNav.navigate();
        }
      },
      [parentWorkflowExecution, parentWorkflowNav]
    );

    // Extract trigger type from stepType (e.g., 'trigger_manual' -> 'manual')
    const triggerType = isTriggerPseudoStep
      ? stepExecution?.stepType?.replace('trigger_', '')
      : undefined;

    const hasInput = Boolean(stepExecution?.input);
    const hasOutput = Boolean(stepExecution?.output);
    const hasError = Boolean(stepExecution?.error);
    const isForeachOrWhile =
      stepExecution?.stepType === 'foreach' || stepExecution?.stepType === 'while';

    const showInput = hasInput;
    const showOutput = hasOutput || hasError || isForeachOrWhile;

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
          showResumeUI={workflowExecutionStatus === ExecutionStatus.WAITING_FOR_INPUT}
          executionId={workflowExecutionId}
          resumeMessage={resumeMessage}
          resumeSchema={resumeSchema}
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
          {isWorkflowExecuteStep && childWorkflowExecution && (
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  {getExecutionStatusIcon(euiTheme, childWorkflowExecution.status)}
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiTitle size="xs">
                    <h3>
                      <EuiLink href={workflowNav.href} onClick={handleWorkflowLinkClick}>
                        {`${stepExecution?.stepType}: ${childWorkflowExecution.workflowName}`}
                      </EuiLink>
                    </h3>
                  </EuiTitle>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          )}
          {parentWorkflowExecution && (
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  {getExecutionStatusIcon(euiTheme, parentWorkflowExecution.status)}
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiTitle size="xs">
                    <h3>
                      <EuiLink
                        href={parentWorkflowNav.href}
                        onClick={handleParentWorkflowLinkClick}
                      >
                        {`${parentWorkflowExecution.workflowName}: ${stepExecution?.stepId}`}
                      </EuiLink>
                    </h3>
                  </EuiTitle>
                </EuiFlexItem>
              </EuiFlexGroup>
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
