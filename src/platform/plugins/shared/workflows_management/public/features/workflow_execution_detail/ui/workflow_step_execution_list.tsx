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
  EuiButton,
} from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import { WorkflowStepExecutionListItem } from './workflow_step_execution_list_item';

interface WorkflowStepExecutionListProps {
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
              id="workflows.workflowStepExecutionList.loadingStepExecutions"
              defaultMessage="Loading step executions..."
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
              id="workflows.workflowStepExecutionList.errorLoadingStepExecutions"
              defaultMessage="Error loading step executions"
            />
          </h2>
        }
        body={<EuiText>{error.message}</EuiText>}
      />
    );
  }
  if (!execution?.stepExecutions?.length) {
    return (
      <EuiEmptyPrompt
        {...emptyPromptCommonProps}
        css={containerCss}
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
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="s" justifyContent="flexStart" css={containerCss}>
      {execution.stepExecutions.map((stepExecution) => (
        <WorkflowStepExecutionListItem
          key={stepExecution.id}
          stepExecution={stepExecution}
          selected={stepExecution.id === selectedId}
          onClick={() => onStepExecutionClick(stepExecution.id)}
        />
      ))}
      <EuiButton onClick={onClose} css={{ justifySelf: 'flex-end', marginTop: 'auto' }}>
        <FormattedMessage id="workflows.workflowStepExecutionList.done" defaultMessage="Done" />
      </EuiButton>
    </EuiFlexGroup>
  );
};
