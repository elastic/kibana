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
  EuiButton,
  EuiFlexItem,
  EuiTitle,
  EuiButtonEmpty,
} from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { WorkflowStepExecutionListItem } from './workflow_step_execution_list_item';

export interface WorkflowStepExecutionListProps {
  execution: WorkflowExecutionDto | null;
  isLoading: boolean;
  error: Error | null;
  onStepExecutionClick: (stepExecutionId: string) => void;
  onClose: () => void;
  selectedId: string | null;
}

const emptyPromptCommonProps: EuiEmptyPromptProps = { titleSize: 'xs', paddingSize: 's' };

export const WorkflowStepExecutionList = ({
  isLoading,
  error,
  execution,
  onStepExecutionClick,
  selectedId,
  onClose,
}: WorkflowStepExecutionListProps) => {
  const styles = useMemoCss(componentStyles);
  let content: React.ReactNode = null;

  if (isLoading) {
    content = (
      <EuiEmptyPrompt
        {...emptyPromptCommonProps}
        icon={<EuiLoadingSpinner size="l" />}
        title={
          <h2>
            <FormattedMessage
              id="workflows.workflowStepExecutionList.loadingStepExecutions"
              defaultMessage="Loading step executions..."
            />
          </h2>
        }
      />
    );
  }

  if (error) {
    content = (
      <EuiEmptyPrompt
        {...emptyPromptCommonProps}
        icon={<EuiIcon type="error" size="l" />}
        title={
          <h2>
            <FormattedMessage
              id="workflows.workflowStepExecutionList.errorLoadingStepExecutions"
              defaultMessage="Error loading step executions"
            />
          </h2>
        }
        body={<EuiText>{error.message}</EuiText>}
      />
    );
  }
  if (!execution || !execution.stepExecutions.length) {
    content = (
      <EuiEmptyPrompt
        {...emptyPromptCommonProps}
        icon={<EuiIcon type="play" size="l" />}
        title={
          <h2>
            <FormattedMessage
              id="workflows.workflowStepExecutionList.noStepExecutionsFound"
              defaultMessage="No step executions found"
            />
          </h2>
        }
      />
    );
  } else {
    content = (
      <EuiFlexGroup direction="column" gutterSize="s" justifyContent="flexStart">
        {execution.stepExecutions.map((stepExecution) => (
          <WorkflowStepExecutionListItem
            key={stepExecution.id}
            stepExecution={stepExecution}
            selected={stepExecution.id === selectedId}
            onClick={() => onStepExecutionClick(stepExecution.id)}
          />
        ))}
        <EuiButton onClick={onClose} css={styles.doneButton}>
          <FormattedMessage id="workflows.workflowStepExecutionList.done" defaultMessage="Done" />
        </EuiButton>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      justifyContent="flexStart"
      css={styles.container}
    >
      <EuiFlexItem grow={false}>
        <header css={styles.header}>
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiTitle size="xxs">
                <EuiButtonEmpty iconType="arrowLeft" onClick={onClose} size="xs">
                  <FormattedMessage
                    id="workflows.workflowStepExecutionList.backToExecution"
                    defaultMessage="Back to executions"
                  />
                </EuiButtonEmpty>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>{/* TODO: step execution filters */}</EuiFlexItem>
          </EuiFlexGroup>
        </header>
      </EuiFlexItem>
      <EuiFlexItem>{content}</EuiFlexItem>
    </EuiFlexGroup>
  );
};

const componentStyles = {
  container: ({ euiTheme }: UseEuiTheme) =>
    css({
      padding: euiTheme.size.m,
    }),
  header: css({
    minHeight: `32px`,
  }),
  doneButton: css({
    justifySelf: 'flex-end',
    marginTop: 'auto',
  }),
};
