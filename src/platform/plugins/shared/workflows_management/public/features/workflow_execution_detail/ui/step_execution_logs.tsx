/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiAccordion,
  EuiBadge,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiText,
} from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { WorkflowExecutionLogEntry } from '@kbn/workflows-ui';
import { useStepExecutionLogs } from '../model/use_step_execution_logs';

const levelColor = (
  level: WorkflowExecutionLogEntry['level']
): 'default' | 'hollow' | 'warning' | 'danger' | 'success' => {
  switch (level) {
    case 'error':
      return 'danger';
    case 'warn':
      return 'warning';
    case 'info':
      return 'success';
    case 'debug':
    case 'trace':
      return 'hollow';
    default:
      return 'default';
  }
};

const title = i18n.translate('workflowsManagement.stepExecutionLogs.title', {
  defaultMessage: 'Logs',
});

interface StepExecutionLogsProps {
  workflowExecutionId: string;
  stepExecutionId: string;
  /** Skip the accordion chrome when the parent already provides a Logs tab. */
  embedded?: boolean;
}

export const StepExecutionLogs = React.memo<StepExecutionLogsProps>(
  ({ workflowExecutionId, stepExecutionId, embedded = false }) => {
    const { data, isLoading, isError } = useStepExecutionLogs(
      workflowExecutionId,
      stepExecutionId,
      true
    );
    const logs = data?.logs ?? [];

    const body = (
      <EuiPanel
        hasBorder={!embedded}
        paddingSize="s"
        data-test-subj="workflowStepExecutionLogsPanel"
      >
        {isLoading && <EuiLoadingSpinner size="m" />}
        {isError && (
          <EuiText size="xs" color="danger">
            <FormattedMessage
              id="workflowsManagement.stepExecutionLogs.error"
              defaultMessage="Could not load logs for this step."
            />
          </EuiText>
        )}
        {!isLoading && !isError && logs.length === 0 && (
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="workflowsManagement.stepExecutionLogs.empty"
              defaultMessage="No logs for this step."
            />
          </EuiText>
        )}
        {!isLoading && !isError && logs.length > 0 && (
          <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
            {logs.map((log) => (
              <EuiFlexItem grow={false} key={log.id}>
                <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false} wrap={false}>
                  <EuiFlexItem grow={false}>
                    <EuiBadge color={levelColor(log.level)}>{log.level ?? 'info'}</EuiBadge>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs" color="subdued">
                      {log.timestamp}
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiCode transparentBackground>{log.message}</EuiCode>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        )}
      </EuiPanel>
    );

    if (embedded) {
      return <div data-test-subj="workflowStepExecutionLogs">{body}</div>;
    }

    return (
      <EuiAccordion
        id={`step-execution-logs-${stepExecutionId}`}
        data-test-subj="workflowStepExecutionLogs"
        initialIsOpen={true}
        arrowDisplay="left"
        buttonContent={
          <EuiText size="s">
            <strong>{title}</strong>
            {data != null ? ` (${logs.length})` : ''}
          </EuiText>
        }
      >
        {body}
      </EuiAccordion>
    );
  }
);

StepExecutionLogs.displayName = 'StepExecutionLogs';
