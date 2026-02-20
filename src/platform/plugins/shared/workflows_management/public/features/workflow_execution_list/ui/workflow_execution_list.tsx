/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiEmptyPromptProps, UseEuiTheme } from '@elastic/eui';
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useEffect, useMemo, useRef } from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { FormattedMessage } from '@kbn/i18n-react';
import { type WorkflowExecutionListDto } from '@kbn/workflows';
import { ExecutionListFilters } from './workflow_execution_list_filters';
import { WorkflowExecutionListItem } from './workflow_execution_list_item';
import type { ExecutionListFiltersQueryParams } from './workflow_execution_list_stateful';

export interface WorkflowExecutionListProps {
  executions: WorkflowExecutionListDto | null;
  filters: ExecutionListFiltersQueryParams;
  onFiltersChange: (filters: ExecutionListFiltersQueryParams) => void;
  isInitialLoading: boolean;
  isLoadingMore: boolean;
  error: Error | null;
  onExecutionClick: (executionId: string) => void;
  selectedId: string | null;
  setPaginationObserver: (ref: HTMLDivElement | null) => void;
}

// TODO: use custom table? add pagination and search

const emptyPromptCommonProps: EuiEmptyPromptProps = { titleSize: 'xs', paddingSize: 'm' };

export const WorkflowExecutionList = ({
  filters,
  onFiltersChange,
  isInitialLoading,
  isLoadingMore,
  error,
  executions,
  onExecutionClick,
  selectedId,
  setPaginationObserver,
}: WorkflowExecutionListProps) => {
  const styles = useMemoCss(componentStyles);
  const scrollableContentRef = useRef<HTMLDivElement>(null);

  // Extract unique executedBy values from executions
  const availableExecutedByOptions = useMemo(() => {
    if (!executions?.results) return [];
    const uniqueUsers = new Set<string>();
    executions.results.forEach((execution) => {
      if (execution.executedBy) {
        uniqueUsers.add(execution.executedBy);
      }
    });
    return Array.from(uniqueUsers).sort();
  }, [executions]);

  // Reset scroll position when filters change
  useEffect(() => {
    if (scrollableContentRef.current) {
      scrollableContentRef.current.scrollTop = 0;
    }
  }, [filters.statuses, filters.executionTypes]);

  let content: React.ReactNode = null;

  if (isInitialLoading) {
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
    const lastExecutionId = executions.results[executions.results.length - 1]?.id;

    content = (
      <>
        <EuiFlexGroup direction="column" gutterSize="s">
          {executions.results.map((execution) => (
            <React.Fragment key={execution.id}>
              <EuiFlexItem grow={false}>
                <WorkflowExecutionListItem
                  status={execution.status}
                  isTestRun={execution.isTestRun}
                  startedAt={new Date(execution.startedAt)}
                  duration={execution.duration}
                  executedBy={execution.executedBy}
                  triggeredBy={execution.triggeredBy}
                  selected={execution.id === selectedId}
                  onClick={() => onExecutionClick(execution.id)}
                />
              </EuiFlexItem>
              {/* Observer element for infinite scrolling - attached to last item */}
              {execution.id === lastExecutionId && (
                <div
                  ref={setPaginationObserver}
                  css={css`
                    height: 1px;
                  `}
                />
              )}
            </React.Fragment>
          ))}
        </EuiFlexGroup>
        {isLoadingMore && (
          <EuiFlexGroup justifyContent="center" css={css({ marginTop: '8px' })}>
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="m" />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </>
    );
  }

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      justifyContent="flexStart"
      css={styles.container}
      data-test-subj="workflowExecutionList"
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
            <ExecutionListFilters
              filters={filters}
              onFiltersChange={onFiltersChange}
              availableExecutedByOptions={availableExecutedByOptions}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </header>
      <EuiFlexItem grow={true} css={styles.scrollableWrapper}>
        <div ref={scrollableContentRef} css={styles.scrollableContent}>
          {content}
        </div>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const componentStyles = {
  container: ({ euiTheme }: UseEuiTheme) =>
    css({
      padding: euiTheme.size.m,
      height: '100%',
      overflow: 'hidden',
      backgroundColor: euiTheme.colors.backgroundBasePlain,
    }),
  scrollableWrapper: css({
    minHeight: 0,
  }),
  scrollableContent: css({
    height: '100%',
    overflowY: 'auto',
  }),
};
