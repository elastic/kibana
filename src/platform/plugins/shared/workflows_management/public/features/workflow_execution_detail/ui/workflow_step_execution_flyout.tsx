/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  EuiText,
  EuiTabs,
  EuiTab,
  useEuiTheme,
  EuiButtonIcon,
  EuiDescriptionList,
  EuiSkeletonText,
} from '@elastic/eui';
import { WorkflowExecutionLogsTable } from '../../workflow_execution_logs/ui/workflow_execution_logs_table';
import { StatusBadge, getExecutionStatusIcon, JSONDataTable } from '../../../shared/ui';
import { useStepExecution } from '../model/use_step_execution';
import { useWorkflowUrlState } from '../../../hooks/use_workflow_url_state';

interface WorkflowStepExecutionFlyoutProps {
  workflowExecutionId: string;
  stepId: string;
  closeFlyout: () => void;
  goNext?: () => void;
  goPrevious?: () => void;
}

export const WorkflowStepExecutionFlyout = ({
  workflowExecutionId,
  stepId,
  closeFlyout,
  goNext,
  goPrevious,
}: WorkflowStepExecutionFlyoutProps) => {
  const { euiTheme } = useEuiTheme();

  const { data: stepExecution, isLoading } = useStepExecution(workflowExecutionId, stepId);

  const { setSelectedStep } = useWorkflowUrlState();

  useEffect(() => {
    setSelectedStep(stepId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepId]);

  const complicatedFlyoutTitleId = `Step ${stepExecution?.stepId} Execution Details`;

  const tabs = useMemo(
    () => [
      {
        id: 'input',
        name: 'Input',
      },
      {
        id: 'output',
        name: stepExecution?.output ? 'Output' : 'Error',
      },
      {
        id: 'timeline',
        name: 'Timeline',
      },
    ],
    [stepExecution]
  );

  const [selectedTabId, setSelectedTabId] = useState<string>('input');

  const renderInput = () => {
    if (stepExecution?.input) {
      return (
        <JSONDataTable
          data={stepExecution.input}
          title="Step Input"
          data-test-subj="stepExecutionInputTable"
        />
      );
    }
    return <EuiText>No input</EuiText>;
  };

  const renderOutput = () => {
    if (stepExecution?.error) {
      return (
        <JSONDataTable
          data={stepExecution.error as any}
          title="Step Error"
          data-test-subj="stepExecutionErrorTable"
        />
      );
    }
    if (stepExecution?.output) {
      return (
        <JSONDataTable
          data={stepExecution.output}
          title="Step Output"
          data-test-subj="stepExecutionOutputTable"
        />
      );
    }
    return <EuiText>No output</EuiText>;
  };

  const renderTimeline = () => {
    return <WorkflowExecutionLogsTable executionId={workflowExecutionId} stepId={stepId} />;
  };

  return (
    <EuiFlyout
      ownFocus
      onClose={closeFlyout}
      hideCloseButton
      aria-labelledby={complicatedFlyoutTitleId}
      paddingSize="none"
      type="push"
      size="s"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup
          alignItems="center"
          justifyContent="spaceBetween"
          css={{
            width: '100%',
            borderBottom: `1px solid ${euiTheme.colors.lightShade}`,
            padding: euiTheme.size.m,
          }}
        >
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center">
              <EuiButtonIcon
                iconType="arrowLeft"
                onClick={goPrevious}
                disabled={!goPrevious}
                css={{ cursor: goPrevious ? 'pointer' : 'not-allowed' }}
              />
              <EuiButtonIcon
                iconType="arrowRight"
                onClick={goNext}
                disabled={!goNext}
                css={{ cursor: goNext ? 'pointer' : 'not-allowed' }}
              />
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon iconType="cross" color="text" onClick={closeFlyout} />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <div css={{ padding: euiTheme.size.m }}>
          {isLoading && <EuiSkeletonText lines={1} />}
          {stepExecution && (
            <EuiTitle size="m">
              <h2
                id={complicatedFlyoutTitleId}
                css={{ display: 'flex', alignItems: 'center', gap: euiTheme.size.s }}
              >
                {getExecutionStatusIcon(euiTheme, stepExecution.status)}
                {stepExecution.stepId}
              </h2>
            </EuiTitle>
          )}
          <EuiSpacer size="m" />
          <EuiText size="xs">
            {isLoading && <EuiSkeletonText lines={2} />}
            {stepExecution && (
              <EuiDescriptionList
                textStyle="reverse"
                type="responsiveColumn"
                compressed
                listItems={[
                  {
                    title: 'Status',
                    description: <StatusBadge status={stepExecution.status} />,
                  },
                  {
                    title: 'Execution time',
                    description: `${stepExecution.executionTimeMs}ms`,
                  },
                ]}
              />
            )}
          </EuiText>
          <EuiSpacer size="m" />
          <EuiTabs css={{ marginBottom: -13 }}>
            {tabs.map((tab, index) => (
              <EuiTab
                onClick={() => setSelectedTabId(tab.id)}
                isSelected={tab.id === selectedTabId}
                key={index}
              >
                {tab.name}
              </EuiTab>
            ))}
          </EuiTabs>
        </div>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {isLoading && <EuiSkeletonText lines={2} />}
        {selectedTabId === 'input' && renderInput()}
        {selectedTabId === 'output' && renderOutput()}
        {selectedTabId === 'timeline' && renderTimeline()}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
