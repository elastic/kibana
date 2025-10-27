/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiEmptyPromptProps } from '@elastic/eui';
import { EuiEmptyPrompt, EuiIcon, EuiLoadingSpinner, EuiText, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { StepExecutionTimeline } from './step_execution_timeline';
import { useWorkflowExecutionLogs } from '../../../entities/workflows/api/use_workflow_execution_logs';

export const StepExecutionTimelineStateful = ({
  executionId,
  stepExecutionId,
}: {
  executionId: string;
  stepExecutionId: string;
}) => {
  const {
    data: logsData,
    isLoading,
    error,
  } = useWorkflowExecutionLogs({
    executionId,
    stepExecutionId,
    limit: 100, // Get more logs without pagination
    offset: 0,
    enabled: true,
    sortOrder: 'asc',
  });
  const { euiTheme } = useEuiTheme();
  const containerCss = {
    padding: euiTheme.size.s,
  };
  const emptyPromptCommonProps: EuiEmptyPromptProps = { titleSize: 'xs', paddingSize: 's' };

  if (isLoading) {
    return (
      <EuiEmptyPrompt
        {...emptyPromptCommonProps}
        css={containerCss}
        icon={<EuiLoadingSpinner size="l" />}
        title={
          <h2>
            <FormattedMessage
              id="workflows.stepExecutionTimeline.loadingLogs"
              defaultMessage="Loading logs..."
            />
          </h2>
        }
      />
    );
  }

  if (error) {
    return (
      <EuiEmptyPrompt
        {...emptyPromptCommonProps}
        css={containerCss}
        icon={<EuiIcon type="error" size="l" />}
        title={
          <h2>
            <FormattedMessage
              id="workflows.stepExecutionTimeline.errorLoadingLogs"
              defaultMessage="Error loading logs"
            />
          </h2>
        }
        body={
          error instanceof Error ? (
            <EuiText>{error.message}</EuiText>
          ) : (
            <EuiText>{'Unknown error'}</EuiText>
          )
        }
      />
    );
  }

  if (!logsData?.logs?.length) {
    return (
      <EuiEmptyPrompt
        {...emptyPromptCommonProps}
        css={containerCss}
        icon={<EuiIcon type="info" size="l" />}
        title={
          <h2>
            <FormattedMessage
              id="workflows.stepExecutionTimeline.noLogsFound"
              defaultMessage="No logs found"
            />
          </h2>
        }
      />
    );
  }

  return <StepExecutionTimeline logs={logsData.logs} />;
};
