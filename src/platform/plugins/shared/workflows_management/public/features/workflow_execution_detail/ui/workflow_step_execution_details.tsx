/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiTab,
  EuiTabs,
} from '@elastic/eui';
import React, { useEffect, useMemo, useState } from 'react';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';
import { StepExecutionDataView } from './step_execution_data_view';
import { StepExecutionTimelineStateful } from './step_execution_timeline_stateful';
import { isTerminalStatus } from '../lib/execution_status';

interface WorkflowStepExecutionDetailsProps {
  workflowExecutionId: string;
  stepExecution?: WorkflowStepExecutionDto;
  isLoading: boolean;
}

export const WorkflowStepExecutionDetails = React.memo<WorkflowStepExecutionDetailsProps>(
  ({ workflowExecutionId, stepExecution, isLoading }) => {
    const isFinished = useMemo(
      () => Boolean(stepExecution?.status && isTerminalStatus(stepExecution.status)),
      [stepExecution?.status]
    );

    const tabs = useMemo(
      () => [
        {
          id: 'output',
          name: stepExecution?.error ? 'Error' : 'Output',
        },
        {
          id: 'input',
          name: 'Input',
        },
        {
          id: 'timeline',
          name: 'Timeline',
        },
      ],
      [stepExecution]
    );

    const [selectedTabId, setSelectedTabId] = useState<string>(tabs[0].id);

    useEffect(() => {
      // reset the tab to the default one on step change
      setSelectedTabId(tabs[0].id);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stepExecution?.stepId, tabs[0].id]);

    if (isLoading || !stepExecution) {
      return (
        <EuiPanel hasShadow={false} paddingSize="m">
          <EuiSkeletonText lines={1} />
          <EuiSpacer size="l" />
          <EuiSkeletonText lines={4} />
        </EuiPanel>
      );
    }

    return (
      <EuiPanel
        hasShadow={false}
        paddingSize="m"
        css={{ height: '100%', paddingTop: '13px' /* overrides EuiPanel's paddingTop */ }}
      >
        <EuiFlexGroup
          direction="column"
          gutterSize="m"
          css={{ height: '100%', overflow: 'hidden' }}
        >
          <EuiFlexItem grow={false}>
            <EuiTabs expand>
              {tabs.map((tab) => (
                <EuiTab
                  onClick={() => setSelectedTabId(tab.id)}
                  isSelected={tab.id === selectedTabId}
                  key={tab.id}
                  css={{ lineHeight: 'normal' }}
                >
                  {tab.name}
                </EuiTab>
              ))}
            </EuiTabs>
          </EuiFlexItem>
          {isFinished ? (
            <EuiFlexItem css={{ overflowY: 'auto' }}>
              {selectedTabId === 'output' && (
                <StepExecutionDataView stepExecution={stepExecution} mode="output" />
              )}
              {selectedTabId === 'input' && (
                <StepExecutionDataView stepExecution={stepExecution} mode="input" />
              )}
              {selectedTabId === 'timeline' && (
                <StepExecutionTimelineStateful
                  executionId={workflowExecutionId}
                  stepExecutionId={stepExecution.id}
                />
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
