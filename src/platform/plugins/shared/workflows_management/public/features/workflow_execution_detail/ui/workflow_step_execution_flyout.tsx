/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
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
} from '@elastic/eui';
import type { EsWorkflowStepExecution } from '@kbn/workflows';
import { WorkflowExecutionLogsTable } from '../../workflow_execution_logs/ui/workflow_execution_logs_table';
import { StatusBadge, getExecutionStatusIcon } from '../../../shared/ui/status_badge';

interface WorkflowStepExecutionFlyoutProps {
  workflowExecutionId: string;
  stepExecution: EsWorkflowStepExecution;
  closeFlyout: () => void;
  goNext?: () => void;
  goPrevious?: () => void;
}

export const WorkflowStepExecutionFlyout = ({
  workflowExecutionId,
  stepExecution,
  closeFlyout,
  goNext,
  goPrevious,
}: WorkflowStepExecutionFlyoutProps) => {
  const { euiTheme } = useEuiTheme();

  const complicatedFlyoutTitleId = `Step ${stepExecution.stepId} Execution Details`;

  const tabs = [
    {
      id: 'input',
      name: 'Input',
    },
    {
      id: 'output',
      name: 'Output',
    },
    {
      id: 'timeline',
      name: 'Timeline',
    },
  ];

  const [selectedTabId, setSelectedTabId] = useState<string>('timeline');

  const renderTabs = tabs.map((tab, index) => (
    <EuiTab
      onClick={() => setSelectedTabId(tab.id)}
      isSelected={tab.id === selectedTabId}
      key={index}
    >
      {tab.name}
    </EuiTab>
  ));

  return (
    <EuiFlyout
      ownFocus
      onClose={closeFlyout}
      hideCloseButton
      aria-labelledby={complicatedFlyoutTitleId}
      paddingSize="none"
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
          <EuiTitle size="m">
            <h2
              id={complicatedFlyoutTitleId}
              css={{ display: 'flex', alignItems: 'center', gap: euiTheme.size.s }}
            >
              {getExecutionStatusIcon(euiTheme, stepExecution.status)}
              {stepExecution.stepId}
            </h2>
          </EuiTitle>
          <EuiSpacer size="m" />
          <EuiText size="xs">
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
          </EuiText>
          <EuiSpacer size="m" />
          <EuiTabs css={{ marginBottom: -13 }}>{renderTabs}</EuiTabs>
        </div>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {selectedTabId === 'input' && <EuiText>Input</EuiText>}
        {selectedTabId === 'output' && <EuiText>Output</EuiText>}
        {selectedTabId === 'timeline' && (
          <WorkflowExecutionLogsTable
            executionId={workflowExecutionId}
            stepId={stepExecution.stepId}
          />
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
