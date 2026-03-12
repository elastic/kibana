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
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';
import { isTerminalStatus } from '@kbn/workflows';
import { StepExecutionDataView } from './step_execution_data_view';
import { WorkflowExecutionOverview } from './workflow_execution_overview';
import { PLUGIN_ID } from '../../../../common';
import { useKibana } from '../../../hooks/use_kibana';
import { getExecutionStatusIcon } from '../../../shared/ui/status_badge';
import type { ChildWorkflowExecutionInfo } from '../model/use_child_workflow_executions';

interface WorkflowStepExecutionDetailsProps {
  workflowExecutionId: string;
  stepExecution?: WorkflowStepExecutionDto;
  workflowExecutionDuration?: number;
  isLoadingStepData?: boolean;
  childWorkflowExecution?: ChildWorkflowExecutionInfo;
  ownerChildExecution?: ChildWorkflowExecutionInfo;
}

export const WorkflowStepExecutionDetails = React.memo<WorkflowStepExecutionDetailsProps>(
  ({
    workflowExecutionId,
    stepExecution,
    workflowExecutionDuration,
    isLoadingStepData,
    childWorkflowExecution,
    ownerChildExecution,
  }) => {
    const { application } = useKibana().services;
    const { euiTheme } = useEuiTheme();
    const isFinished = useMemo(
      () => Boolean(stepExecution?.status && isTerminalStatus(stepExecution.status)),
      [stepExecution?.status]
    );

    const isOverviewPseudoStep = stepExecution?.stepType === '__overview';
    const isTriggerPseudoStep = stepExecution?.stepType?.startsWith('trigger_');
    const isWorkflowExecuteStep =
      stepExecution?.stepType === 'workflow.execute' ||
      stepExecution?.stepType === 'workflow.executeAsync';

    const navigateToChildExecution = useCallback(() => {
      if (childWorkflowExecution) {
        application.navigateToApp(PLUGIN_ID, {
          path: `/${childWorkflowExecution.workflowId}?tab=executions&executionId=${childWorkflowExecution.executionId}`,
        });
      }
    }, [application, childWorkflowExecution]);

    const navigateToOwnerExecution = useCallback(() => {
      if (ownerChildExecution) {
        application.navigateToApp(PLUGIN_ID, {
          path: `/${ownerChildExecution.workflowId}?tab=executions&executionId=${ownerChildExecution.executionId}`,
        });
      }
    }, [application, ownerChildExecution]);

    // Extract trigger type from stepType (e.g., 'trigger_manual' -> 'manual')
    const triggerType = isTriggerPseudoStep
      ? stepExecution?.stepType?.replace('trigger_', '')
      : undefined;

    const hasInput = Boolean(stepExecution?.input);
    const hasError = Boolean(stepExecution?.error);

    const tabs = useMemo(() => {
      if (isTriggerPseudoStep) {
        const pseudoTabs: { id: string; name: string }[] = [];
        if (hasInput) {
          pseudoTabs.push({
            id: 'input',
            name: 'Input',
          });
        }
        return pseudoTabs;
      }
      return [
        {
          id: 'output',
          name: hasError ? 'Error' : 'Output',
        },
        {
          id: 'input',
          name: 'Input',
        },
      ];
    }, [hasInput, hasError, isTriggerPseudoStep]);

    const [selectedTabId, setSelectedTabId] = useState<string>(tabs[0].id);

    useEffect(() => {
      // reset the tab to the default one on step change
      setSelectedTabId(tabs[0].id);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stepExecution?.stepId, tabs[0].id]);

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
                      <EuiLink onClick={navigateToChildExecution}>
                        {`${stepExecution?.stepType}: ${childWorkflowExecution.workflowName}`}
                      </EuiLink>
                    </h3>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiIcon
                    type="popout"
                    size="s"
                    color="primary"
                    onClick={navigateToChildExecution}
                    css={{ cursor: 'pointer' }}
                    aria-label={i18n.translate(
                      'workflowsManagement.stepExecutionDetails.openChildExecution',
                      { defaultMessage: 'Open child workflow execution' }
                    )}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          )}
          {ownerChildExecution && (
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  {getExecutionStatusIcon(euiTheme, ownerChildExecution.status)}
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiTitle size="xs">
                    <h3>
                      <EuiLink onClick={navigateToOwnerExecution}>
                        {`${ownerChildExecution.workflowName}: ${stepExecution?.stepId}`}
                      </EuiLink>
                    </h3>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiIcon
                    type="popout"
                    size="s"
                    color="primary"
                    onClick={navigateToOwnerExecution}
                    css={{ cursor: 'pointer' }}
                    aria-label={i18n.translate(
                      'workflowsManagement.stepExecutionDetails.openOwnerExecution',
                      { defaultMessage: 'Open parent workflow execution' }
                    )}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EuiTabs expand>
              {tabs.map((tab) => (
                <EuiTab
                  onClick={() => setSelectedTabId(tab.id)}
                  isSelected={tab.id === selectedTabId}
                  key={tab.id}
                  css={{ lineHeight: 'normal' }}
                  data-test-subj={`workflowStepTab_${tab.id}`}
                >
                  {tab.name}
                </EuiTab>
              ))}
            </EuiTabs>
          </EuiFlexItem>
          {isFinished ? (
            <EuiFlexItem css={{ overflowY: 'auto' }}>
              {isLoadingStepData ? (
                <EuiPanel hasShadow={false} paddingSize="m">
                  <EuiSkeletonText lines={4} />
                </EuiPanel>
              ) : (
                <>
                  {selectedTabId === 'output' && (
                    <>
                      {isTriggerPseudoStep && (
                        <>
                          <EuiCallOut
                            size="s"
                            title={i18n.translate(
                              'workflowsManagement.stepExecutionDetails.contextAccessTitle',
                              {
                                defaultMessage: 'Access this data in your workflow',
                              }
                            )}
                            iconType="info"
                            announceOnMount={false}
                          >
                            <FormattedMessage
                              id="workflowsManagement.stepExecutionDetails.contextAccessDescription"
                              defaultMessage="You can reference these values using {code}"
                              values={{
                                code: <strong>{`{{ <field> }}`}</strong>,
                              }}
                            />
                          </EuiCallOut>
                          <EuiSpacer size="m" />
                        </>
                      )}
                      <StepExecutionDataView stepExecution={stepExecution} mode="output" />
                    </>
                  )}
                  {selectedTabId === 'input' && (
                    <>
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
                    </>
                  )}
                </>
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
