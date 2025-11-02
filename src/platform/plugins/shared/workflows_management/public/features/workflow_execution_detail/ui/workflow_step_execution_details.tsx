/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiStat,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useEffect, useMemo, useState } from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';
import { StepExecutionDataView } from './step_execution_data_view';
import { StepExecutionTimelineStateful } from './step_execution_timeline_stateful';
import { formatDuration } from '../../../shared/lib/format_duration';
import { StatusBadge } from '../../../shared/ui';
import { useGetFormattedDateTime } from '../../../shared/ui/use_formatted_date';
import { isTerminalStatus } from '../lib/execution_status';

interface WorkflowStepExecutionDetailsProps {
  workflowExecutionId: string;
  stepExecution?: WorkflowStepExecutionDto;
  isLoading: boolean;
}

export const WorkflowStepExecutionDetails = React.memo<WorkflowStepExecutionDetailsProps>(
  ({ workflowExecutionId, stepExecution, isLoading }) => {
    const styles = useMemoCss(componentStyles);
    const getFormattedDateTime = useGetFormattedDateTime();

    const complicatedFlyoutTitleId = `Step ${stepExecution?.stepId} Execution Details`;
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
          <EuiSkeletonText lines={2} />
          <EuiSpacer size="l" />
          <EuiSkeletonText lines={4} />
        </EuiPanel>
      );
    }

    return (
      <EuiFlexGroup direction="column" gutterSize="s" style={{ height: '100%' }}>
        <EuiFlexItem grow={false}>
          <EuiPanel hasShadow={false} paddingSize="m">
            <EuiFlexGroup direction="column" gutterSize="m">
              <EuiFlexItem grow={false}>
                <p>{getFormattedDateTime(new Date(stepExecution.startedAt))}</p>
                <EuiTitle size="m">
                  <h2 id={complicatedFlyoutTitleId} css={styles.title}>
                    {stepExecution.stepId}
                  </h2>
                </EuiTitle>
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiText size="xs">
                  {stepExecution && (
                    <EuiFlexGroup gutterSize="s">
                      <EuiFlexItem>
                        <EuiPanel hasBorder={true} paddingSize="s">
                          <EuiStat
                            css={styles.stat}
                            title={stepExecution.status}
                            titleSize="xxs"
                            textAlign="left"
                            isLoading={isLoading}
                            description="Status"
                          >
                            <StatusBadge
                              textProps={{ css: styles.statusBadge }}
                              status={stepExecution.status}
                            />
                          </EuiStat>
                        </EuiPanel>
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiPanel hasBorder={true} paddingSize="s">
                          <EuiStat
                            css={styles.stat}
                            title={formatDuration(stepExecution.executionTimeMs ?? 0)}
                            titleSize="xxs"
                            textAlign="left"
                            isLoading={isLoading || stepExecution.executionTimeMs === undefined}
                            description="Execution time"
                          />
                        </EuiPanel>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  )}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>

        {isFinished && (
          <EuiFlexItem grow={true}>
            <EuiTabs bottomBorder={false} css={styles.tabs}>
              {tabs.map((tab) => (
                <EuiTab
                  onClick={() => setSelectedTabId(tab.id)}
                  isSelected={tab.id === selectedTabId}
                  key={tab.id}
                >
                  {tab.name}
                </EuiTab>
              ))}
            </EuiTabs>
            <EuiHorizontalRule margin="none" />
            <EuiPanel hasShadow={false} paddingSize="m">
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
            </EuiPanel>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }
);
WorkflowStepExecutionDetails.displayName = 'WorkflowStepExecutionDetails';

WorkflowStepExecutionDetails.displayName = 'WorkflowStepExecutionDetails';

const componentStyles = {
  title: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'flex',
      alignItems: 'center',
      gap: euiTheme.size.xs,
    }),
  stat: css`
    & .euiStat__title {
      margin-block-end: 0;
    }
  `,
  statusBadge: css`
    font-weight: 600;
  `,
  tabs: ({ euiTheme }: UseEuiTheme) =>
    css({
      padding: `0 ${euiTheme.size.m}`,
    }),
};
