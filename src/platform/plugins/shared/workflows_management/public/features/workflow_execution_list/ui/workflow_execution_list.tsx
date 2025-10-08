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
  EuiEmptyPrompt,
  type EuiEmptyPromptProps,
  EuiFlexGroup,
  EuiIcon,
  EuiLoadingSpinner,
  EuiText,
  EuiTitle,
  EuiFlexItem,
} from '@elastic/eui';
import { type WorkflowExecutionListDto } from '@kbn/workflows';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { WorkflowExecutionListItem } from './workflow_execution_list_item';
import { ExecutionListFilters } from './workflow_execution_list_filters';
import type { ExecutionListFiltersQueryParams } from './workflow_execution_list_stateful';

export interface WorkflowExecutionListProps {
  executions: WorkflowExecutionListDto | null;
  filters: ExecutionListFiltersQueryParams;
  onFiltersChange: (filters: ExecutionListFiltersQueryParams) => void;
  isLoading: boolean;
  error: Error | null;
  onExecutionClick: (executionId: string) => void;
  selectedId: string | null;
}

// TODO: use custom table? add pagination and search

const emptyPromptCommonProps: EuiEmptyPromptProps = { titleSize: 'xs', paddingSize: 'm' };

export const WorkflowExecutionList = ({
  filters,
  onFiltersChange,
  isLoading,
  error,
  executions,
  onExecutionClick,
  selectedId,
}: WorkflowExecutionListProps) => {
  const styles = useMemoCss(componentStyles);

  let content: React.ReactNode = null;

  if (isLoading) {
    content = (
      <EuiEmptyPrompt
        {...emptyPromptCommonProps}
        css={styles.container}
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
  } else if (error) {
    content = (
      <EuiEmptyPrompt
        {...emptyPromptCommonProps}
        css={styles.container}
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
  } else if (!executions || !executions.results.length) {
    content = (
      <EuiEmptyPrompt
        {...emptyPromptCommonProps}
        css={styles.container}
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
  } else {
    content = executions.results.map((execution) => (
      <WorkflowExecutionListItem
        key={execution.id}
        status={execution.status}
        startedAt={new Date(execution.startedAt)}
        duration={execution.duration}
        selected={execution.id === selectedId}
        onClick={() => onExecutionClick(execution.id)}
      />
    ));
  }

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      justifyContent="flexStart"
      css={styles.container}
    >
      <header>
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem>
            <EuiTitle size="xxs">
              <h2>
                <FormattedMessage
                  id="workflows.workflowExecutionList.title"
                  defaultMessage="Execution history"
                />
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ExecutionListFilters filters={filters} onFiltersChange={onFiltersChange} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </header>
      {content}
    </EuiFlexGroup>
  );
};

const componentStyles = {
  container: ({ euiTheme }: UseEuiTheme) =>
    css({
      padding: euiTheme.size.m,
      overflowY: 'auto',
    }),
};
