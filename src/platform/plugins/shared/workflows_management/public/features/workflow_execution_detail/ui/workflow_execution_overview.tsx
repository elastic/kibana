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
  EuiPanel,
  EuiText,
  formatDate,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';

import { StepExecutionDataView } from './step_execution_data_view';
import { formatDuration } from '../../../shared/lib/format_duration';
import { getStatusLabel } from '../../../shared/translations/status_translations';
import { getExecutionStatusIcon } from '../../../shared/ui/status_badge';

interface WorkflowExecutionOverviewProps {
  stepExecution: WorkflowStepExecutionDto;
}

export const WorkflowExecutionOverview = React.memo<WorkflowExecutionOverviewProps>(
  ({ stepExecution }) => {
    const { euiTheme } = useEuiTheme();

    // Extract execution data from stepExecution.input which contains the context
    const context = stepExecution.input as Record<string, unknown> | undefined;
    const executionStarted = stepExecution.startedAt;
    const executionEnded = context?.now as string | undefined;
    const executionDuration = stepExecution.executionTimeMs;

    return (
      <EuiPanel hasShadow={false} paddingSize="l" css={{ height: '100%', overflowY: 'auto' }}>
        <EuiFlexGroup direction="column" gutterSize="l">
          {/* Status Header */}
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
              {executionDuration !== null && executionDuration !== undefined && (
                <EuiText size="xs" color="subdued">
                  {formatDuration(executionDuration)}
                </EuiText>
              )}
            </div>
          </EuiFlexItem>

          {/* Execution times */}
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
                  <strong>
                    {i18n.translate('workflowsManagement.executionOverview.executionStarted', {
                      defaultMessage: 'Execution started',
                    })}
                  </strong>
                </EuiText>
                <EuiText size="xs">
                  <strong>
                    {executionStarted ? formatDate(executionStarted, 'dateTime') : '-'}
                  </strong>
                </EuiText>
              </div>

              <div
                css={css`
                  display: flex;
                  flex-direction: column;
                  gap: 2px;
                  flex: 1;
                `}
              >
                <EuiText size="xs" color="subdued">
                  <strong>
                    {i18n.translate('workflowsManagement.executionOverview.executionEnded', {
                      defaultMessage: 'Execution ended',
                    })}
                  </strong>
                </EuiText>
                <EuiText size="xs">
                  <strong>{executionEnded ? formatDate(executionEnded, 'dateTime') : '-'}</strong>
                </EuiText>
              </div>
            </div>
          </EuiFlexItem>

          {/* Context Data */}
          <EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiCallOut
                  size="s"
                  title={i18n.translate(
                    'workflowsManagement.executionOverview.contextAccessTitle',
                    {
                      defaultMessage: 'Access this data in your workflow',
                    }
                  )}
                  iconType="info"
                  announceOnMount={false}
                >
                  <FormattedMessage
                    id="workflowsManagement.executionOverview.contextAccessDescription"
                    defaultMessage="You can reference these values using {code}"
                    values={{
                      code: <strong>{`{{ <field> }}`}</strong>,
                    }}
                  />
                </EuiCallOut>
              </EuiFlexItem>
              <EuiFlexItem>
                <StepExecutionDataView stepExecution={stepExecution} mode="input" />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }
);

WorkflowExecutionOverview.displayName = 'WorkflowExecutionOverview';
