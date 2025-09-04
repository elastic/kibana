/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiThemeComputed, EuiTreeViewProps, UseEuiTheme } from '@elastic/eui';
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
  useEuiTheme,
  EuiTreeView,
  EuiBeacon,
} from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  ExecutionStatus,
  isDangerousStatus,
  type EsWorkflowStepExecution,
  type WorkflowExecutionDto,
  type StepExecutionTreeItem,
} from '@kbn/workflows';
import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import { StepExecutionTreeItemLabel } from './step_execution_tree_item_label';
import { getStepIconType } from '../../../shared/ui/get_step_icon_type';
import { getExecutionStatusColors } from '../../../shared/ui/status_badge';

function StepIcon({
  stepType,
  executionStatus,
}: {
  stepType: string;
  executionStatus: ExecutionStatus;
}) {
  const { euiTheme } = useEuiTheme();
  if (executionStatus === ExecutionStatus.RUNNING) {
    return <EuiLoadingSpinner size="m" />;
  }
  if (executionStatus === ExecutionStatus.WAITING_FOR_INPUT) {
    return <EuiBeacon size={14} color="warning" />;
  }
  return (
    <EuiIcon
      type={getStepIconType(stepType)}
      color={getExecutionStatusColors(euiTheme, executionStatus).color}
      css={
        // change fill and color of the icon for non-completed statuses, for multi-color logos
        executionStatus !== ExecutionStatus.COMPLETED &&
        css`
          & * {
            fill: ${getExecutionStatusColors(euiTheme, executionStatus).color};
            color: ${getExecutionStatusColors(euiTheme, executionStatus).color};
          }
        `
      }
    />
  );
}

function convertTreeToEuiTreeViewItems(
  treeItems: StepExecutionTreeItem[],
  stepExecutionMap: Map<string, EsWorkflowStepExecution>,
  euiTheme: EuiThemeComputed,
  selectedId: string | null,
  onClickHandler: (stepExecutionId: string) => void
): EuiTreeViewProps['items'] {
  const onClickFn = onClickHandler;
  return treeItems.map((item) => {
    const stepExecution = stepExecutionMap.get(item.stepExecutionId ?? '');
    return {
      ...item,
      id: item.stepExecutionId ?? `${item.stepId}-${item.executionIndex}-no-step-execution`,
      icon: <StepIcon stepType={item.stepType} executionStatus={item.status} />,
      css: isDangerousStatus(item.status)
        ? css`
            &,
            &:active,
            &:focus {
              background-color: ${getExecutionStatusColors(euiTheme, item.status).backgroundColor};
            }

            &:hover {
              background-color: ${euiTheme.colors.backgroundLightDanger};
            }
          `
        : undefined,
      label: (
        <StepExecutionTreeItemLabel
          stepId={item.stepId}
          status={item.status}
          executionIndex={item.executionIndex}
          executionTimeMs={stepExecution?.executionTimeMs ?? null}
          stepType={item.stepType}
          selected={selectedId === stepExecution?.id}
        />
      ),
      children:
        item.children.length > 0
          ? convertTreeToEuiTreeViewItems(
              item.children,
              stepExecutionMap,
              euiTheme,
              selectedId,
              onClickFn
            )
          : undefined,
      callback:
        // TODO: for nodes with children, we don't want other onClick behavior besides expanding/collapsing
        () => {
          onClickFn(item.stepExecutionId ?? '');
          // string is expected by EuiTreeView for some reason
          return item.stepExecutionId ?? '';
        },
    };
  });
}

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
  const { euiTheme } = useEuiTheme();

  let content: React.ReactNode = null;

  if (isLoading && !execution) {
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
  } else if (error) {
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
  } else if (!execution) {
    content = (
      <EuiEmptyPrompt
        {...emptyPromptCommonProps}
        icon={<EuiIcon type="play" size="l" />}
        title={
          <h2>
            <FormattedMessage
              id="workflows.workflowStepExecutionList.noExecutionFound"
              defaultMessage="No execution found"
            />
          </h2>
        }
      />
    );
  } else if (execution.workflowDefinition) {
    const stepExecutionMap = new Map<string, EsWorkflowStepExecution>();
    for (const stepExecution of execution.stepExecutions) {
      stepExecutionMap.set(stepExecution.id, stepExecution);
    }
    const items: EuiTreeViewProps['items'] = convertTreeToEuiTreeViewItems(
      execution.stepExecutionsTree,
      stepExecutionMap,
      euiTheme,
      selectedId,
      onStepExecutionClick
    );
    content = (
      <>
        <div css={styles.treeViewContainer}>
          <EuiTreeView
            showExpansionArrows
            expandByDefault
            items={items}
            aria-label={i18n.translate(
              'workflows.workflowStepExecutionList.workflowStepExecutionTreeAriaLabel',
              {
                defaultMessage: 'Workflow step execution tree',
              }
            )}
          />
        </div>
        <EuiButton onClick={onClose} css={styles.doneButton}>
          <FormattedMessage id="workflows.workflowStepExecutionList.done" defaultMessage="Done" />
        </EuiButton>
      </>
    );
  } else {
    content = (
      <EuiEmptyPrompt
        {...emptyPromptCommonProps}
        icon={<EuiIcon type="error" size="l" />}
        title={
          <h2>
            <FormattedMessage
              id="workflows.workflowStepExecutionList.errorLoadingStepExecutions"
              defaultMessage="Error loading execution graph"
            />
          </h2>
        }
      />
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
      <EuiFlexItem css={styles.content}>{content}</EuiFlexItem>
    </EuiFlexGroup>
  );
};

const componentStyles = {
  container: ({ euiTheme }: UseEuiTheme) =>
    css({
      padding: euiTheme.size.m,
      overflow: 'hidden',
    }),
  content: css({
    overflow: 'hidden',
  }),
  header: css({
    minHeight: `32px`,
    display: 'flex',
    alignItems: 'center',
  }),
  doneButton: css({
    marginTop: 'auto',
    justifySelf: 'flex-end',
    flexShrink: 0,
  }),
  treeViewContainer: css({
    overflowY: 'auto',
    '& .euiTreeView__nodeLabel': {
      flexGrow: 1,
      textAlign: 'left',
    },
  }),
};
