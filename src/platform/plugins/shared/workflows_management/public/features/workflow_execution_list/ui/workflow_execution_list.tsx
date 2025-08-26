/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiEmptyPrompt,
  type EuiEmptyPromptProps,
  EuiFlexGroup,
  EuiIcon,
  EuiLoadingSpinner,
  EuiText,
  useEuiTheme,
  EuiTitle,
} from '@elastic/eui';
import type { WorkflowExecutionListDto } from '@kbn/workflows';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { WorkflowExecutionListItem } from './workflow_execution_list_item';

interface WorkflowExecutionListProps {
  executions: WorkflowExecutionListDto | null;
  isLoading: boolean;
  error: Error | null;
  onExecutionClick: (executionId: string) => void;
  selectedId: string | null;
}

// TODO: use custom table? add pagination and search

const emptyPromptCommonProps: EuiEmptyPromptProps = { titleSize: 'xs', paddingSize: 's' };

export const WorkflowExecutionList = ({
  isLoading,
  error,
  executions,
  onExecutionClick,
  selectedId,
}: WorkflowExecutionListProps) => {
  const { euiTheme } = useEuiTheme();

  const containerCss = {
    padding: euiTheme.size.s,
  };

  if (isLoading) {
    return (
      <EuiEmptyPrompt
        {...emptyPromptCommonProps}
        css={containerCss}
        icon={<EuiLoadingSpinner size="l" />}
        title={
          <h2>
            <FormattedMessage
              id="workflows.workflowExecutionList.loadingExecutions"
              defaultMessage="Loading executions..."
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
              id="workflows.workflowExecutionList.errorLoadingExecutions"
              defaultMessage="Error loading workflow executions"
            />
          </h2>
        }
        body={<EuiText>{error.message}</EuiText>}
      />
    );
  }
  if (!executions?.results?.length) {
    return (
      <EuiEmptyPrompt
        {...emptyPromptCommonProps}
        css={containerCss}
        icon={<EuiIcon type="play" size="l" />}
        title={
          <h2>
            <FormattedMessage
              id="workflows.workflowExecutionList.noExecutionsFound"
              defaultMessage="No executions found"
            />
          </h2>
        }
        body={
          <p>
            <FormattedMessage
              id="workflows.workflowExecutionList.noExecutionsFoundDescription"
              defaultMessage="Workflow has not been executed yet."
            />
          </p>
        }
      />
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="s" justifyContent="flexStart" css={containerCss}>
      <EuiTitle size="xxs">
        <h2>
          <FormattedMessage
            id="workflows.workflowExecutionList.title"
            defaultMessage="Workflow Executions"
          />
        </h2>
      </EuiTitle>
      {executions.results.map((execution) => (
        <WorkflowExecutionListItem
          key={execution.id}
          status={execution.status}
          startedAt={new Date(execution.startedAt)}
          selected={execution.id === selectedId}
          onClick={() => onExecutionClick(execution.id)}
        />
      ))}
    </EuiFlexGroup>
  );
};
