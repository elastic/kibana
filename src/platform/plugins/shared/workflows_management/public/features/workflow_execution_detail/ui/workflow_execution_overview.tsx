/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

import { i18n } from '@kbn/i18n';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';
import { StepExecutionDataView } from './step_execution_data_view';
import { formatDuration } from '../../../shared/lib/format_duration';
import { getStatusLabel } from '../../../shared/translations/status_translations';
import { FormattedRelativeEnhanced } from '../../../shared/ui/formatted_relative_enhanced/formatted_relative_enhanced';
import { getExecutionStatusIcon } from '../../../shared/ui/status_badge';

interface WorkflowExecutionOverviewProps {
  stepExecution: WorkflowStepExecutionDto;
}

export const WorkflowExecutionOverview = React.memo<WorkflowExecutionOverviewProps>(
  ({ stepExecution }) => {
    const { euiTheme } = useEuiTheme();

    const context = stepExecution.input as Record<string, unknown> | undefined;
    const executionData = context?.execution as { isTestRun?: boolean } | undefined;
    const isTestRun = executionData?.isTestRun === true;
    const executionStarted = stepExecution.startedAt;
    const executionEnded = context?.now as string | undefined;
    const executionDuration = stepExecution.executionTimeMs;

    const formatExecutionDate = (date: string) => {
      const dateObj = new Date(date);
      const formatted = dateObj.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      const milliseconds = dateObj.getMilliseconds().toString().padStart(3, '0');
      return `${formatted.replace(',', ' @')}.${milliseconds}`;
    };

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
            <div
              css={css`
                display: flex;
                flex-direction: row;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
              `}
            >
              <div
                css={css`
                  display: flex;
                  flex-direction: column;
                  gap: 4px;
                `}
              >
                <div
                  css={css`
                    display: flex;
                    flex-direction: row;
                    align-items: center;
                    gap: 8px;
                  `}
                >
                  {getExecutionStatusIcon(euiTheme, stepExecution.status)}
                  <EuiText
                    css={css`
                      font-size: 20px;
                      line-height: 24px;
                      font-weight: 600;
                    `}
                  >
                    {getStatusLabel(stepExecution.status)}
                  </EuiText>
                </div>
                <EuiText size="xs" color="subdued">
                  <FormattedRelativeEnhanced value={executionStarted} />
                </EuiText>
              </div>
              <div
                css={css`
                  display: flex;
                  flex-direction: row;
                  align-items: center;
                  gap: 8px;
                `}
              >
                {isTestRun && (
                  <EuiBadge
                    color="hollow"
                    iconType="beaker"
                    css={css`
                      border: 1px solid ${euiTheme.colors.warning};
                    `}
                  />
                )}
                {executionDuration !== null && executionDuration !== undefined && (
                  <EuiText size="xs" color="subdued">
                    <span
                      css={css`
                        display: flex;
                        align-items: center;
                        gap: 4px;
                      `}
                    >
                      <span
                        css={css`
                          font-size: 16px;
                        `}
                      >
                        {'⏱'}
                      </span>
                      {formatDuration(executionDuration)}
                    </span>
                  </EuiText>
                )}
              </div>
            </div>
          </EuiFlexItem>

          <EuiFlexItem grow={false} />

          <EuiFlexItem grow={false}>
            <div
              css={css`
                border-top: 1px solid ${euiTheme.colors.lightShade};
                border-bottom: 1px solid ${euiTheme.colors.lightShade};
                padding: 12px 0;
                display: flex;
                gap: 16px;
              `}
            >
              <div
                css={css`
                  display: flex;
                  flex-direction: column;
                  gap: 2px;
                  flex: 1;
                `}
              >
                <EuiText size="xs" color="subdued">
                  {i18n.translate('workflowsManagement.executionOverview.executionStarted', {
                    defaultMessage: 'Execution started',
                  })}
                </EuiText>
                <EuiText size="s">
                  <strong>{executionStarted ? formatExecutionDate(executionStarted) : '-'}</strong>
                </EuiText>
              </div>

              <div
                css={css`
                  width: 1px;
                  background-color: ${euiTheme.colors.lightShade};
                  align-self: stretch;
                `}
              />

              <div
                css={css`
                  display: flex;
                  flex-direction: column;
                  gap: 2px;
                  flex: 1;
                `}
              >
                <EuiText size="xs" color="subdued">
                  {i18n.translate('workflowsManagement.executionOverview.executionEnded', {
                    defaultMessage: 'Execution ended',
                  })}
                </EuiText>
                <EuiText size="s">
                  <strong>{executionEnded ? formatExecutionDate(executionEnded) : '-'}</strong>
                </EuiText>
              </div>
            </div>
          </EuiFlexItem>

          <EuiFlexItem css={{ overflowY: 'auto' }}>
            <StepExecutionDataView stepExecution={stepExecution} mode="input" />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }
);

WorkflowExecutionOverview.displayName = 'WorkflowExecutionOverview';
