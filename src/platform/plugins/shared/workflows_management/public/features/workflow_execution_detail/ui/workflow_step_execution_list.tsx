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
  EuiFlexItem,
  useEuiTheme,
  EuiTreeView,
  logicalCSS,
} from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { WorkflowStepExecutionDto, WorkflowYaml } from '@kbn/workflows';
import { ExecutionStatus, isInProgressStatus } from '@kbn/workflows';
import { isDangerousStatus, type WorkflowExecutionDto } from '@kbn/workflows';
import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import { StepExecutionTreeItemLabel } from './step_execution_tree_item_label';
import { getExecutionStatusColors } from '../../../shared/ui/status_badge';
import { StepIcon } from '../../../shared/ui/step_icon';
import type { StepExecutionTreeItem } from './build_step_executions_tree';
import { buildStepExecutionsTree } from './build_step_executions_tree';

// handle special nodes like foreachstep:0, foreachstep:1, if:true, if:false
function getStepStatus(item: StepExecutionTreeItem, status: ExecutionStatus | null) {
  const stepType = item.stepType;
  if (
    (stepType === 'foreach-iteration' ||
      stepType === 'foreach' ||
      stepType === 'if-branch' ||
      stepType === 'if') &&
    !item.children.length &&
    !isInProgressStatus(status ?? ExecutionStatus.PENDING)
  ) {
    return ExecutionStatus.SKIPPED;
  }

  if (status) {
    return status;
  }

  return null;
}

function convertTreeToEuiTreeViewItems(
  treeItems: StepExecutionTreeItem[],
  stepExecutionMap: Map<string, WorkflowStepExecutionDto>,
  euiTheme: EuiThemeComputed,
  selectedId: string | null,
  onClickHandler: (stepExecutionId: string) => void
): EuiTreeViewProps['items'] {
  const onClickFn = onClickHandler;
  return treeItems.map((item) => {
    const stepExecution = stepExecutionMap.get(item.stepExecutionId ?? '');
    const status = getStepStatus(item, stepExecution?.status ?? null);
    return {
      ...item,
      id: item.stepExecutionId ?? `${item.stepId}-${item.executionIndex}-no-step-execution`,
      icon: <StepIcon stepType={item.stepType} executionStatus={status} />,
      css:
        status && isDangerousStatus(status)
          ? css`
              &,
              &:active,
              &:focus {
                background-color: ${getExecutionStatusColors(euiTheme, status).backgroundColor};
              }

              &:hover {
                background-color: ${euiTheme.colors.backgroundLightDanger};
              }
            `
          : undefined,
      label: (
        <StepExecutionTreeItemLabel
          stepId={item.stepId}
          status={status}
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
          let toOpen = item.stepExecutionId;
          if (!toOpen && item.children.length) {
            toOpen = item.children[0].stepExecutionId;
          }
          onClickFn(toOpen ?? '');
          // string is expected by EuiTreeView for some reason
          return toOpen ?? '';
        },
    };
  });
}

export interface WorkflowStepExecutionListProps {
  execution: WorkflowExecutionDto | null;
  definition: WorkflowYaml | null;
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
  definition,
  onStepExecutionClick,
  selectedId,
  onClose,
}: WorkflowStepExecutionListProps) => {
  const styles = useMemoCss(componentStyles);
  const { euiTheme } = useEuiTheme();

  let content: React.ReactNode = null;

  if (isLoading || !execution) {
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
  } else if (execution?.stepExecutions?.length === 0 && !isInProgressStatus(execution?.status)) {
    content = (
      <EuiEmptyPrompt
        {...emptyPromptCommonProps}
        icon={<EuiIcon type="list" size="l" />}
        title={
          <h2>
            <FormattedMessage
              id="workflows.workflowStepExecutionList.noExecutionFound"
              defaultMessage="No step executions found"
            />
          </h2>
        }
      />
    );
  } else if (definition) {
    const skeletonStepExecutions: WorkflowStepExecutionDto[] = definition.steps.map(
      (step, index) => ({
        stepId: step.name,
        stepType: step.type,
        status: ExecutionStatus.PENDING,
        id: `${step.name}-${step.type}-${index}`,
        scopeStack: [],
        workflowRunId: '',
        workflowId: '',
        startedAt: '',
        finishedAt: '',
        children: [],
        globalExecutionIndex: 0,
        stepExecutionIndex: 0,
        topologicalIndex: 0,
      })
    );
    const stepExecutionMap = new Map<string, WorkflowStepExecutionDto>();
    const stepExecutionNameMap = new Map<string, WorkflowStepExecutionDto>();
    for (const stepExecution of execution.stepExecutions) {
      stepExecutionNameMap.set(stepExecution.stepId, stepExecution);
      stepExecutionMap.set(stepExecution.id, stepExecution);
    }
    for (const skeletonStepExecution of skeletonStepExecutions) {
      if (!stepExecutionNameMap.has(skeletonStepExecution.stepId)) {
        stepExecutionMap.set(skeletonStepExecution.id, skeletonStepExecution);
      }
    }
    const stepExecutionsTree = buildStepExecutionsTree(Array.from(stepExecutionMap.values()));
    const items: EuiTreeViewProps['items'] = convertTreeToEuiTreeViewItems(
      stepExecutionsTree,
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
      <EuiFlexItem grow={false}>{/* TODO: step execution filters */}</EuiFlexItem>
      <EuiFlexItem css={styles.content}>{content}</EuiFlexItem>
    </EuiFlexGroup>
  );
};

const componentStyles = {
  container: css({
    overflow: 'hidden',
  }),
  content: css({
    overflow: 'hidden',
  }),
  treeViewContainer: ({ euiTheme }: UseEuiTheme) => css`
    overflow-y: auto;

    & .euiTreeView__nodeLabel {
      flex-grow: 1;
      text-align: left;
    }
    & .euiTreeView__nodeInner {
      gap: 6px;
      /* Absolutely position the horizontal tick connecting the item to the vertical line. */
      position: relative;
      padding-inline: ${euiTheme.size.s};

      &::after {
        position: absolute;
        content: '';
        ${logicalCSS('top', '14px')}
        ${logicalCSS('left', 0)}
        ${logicalCSS('width', euiTheme.size.s)}
        ${logicalCSS('border-bottom', euiTheme.border.thin)}
      }
    }
    & .euiTreeView {
      // TODO: reduce padding to fit more nested levels in 300px sidebar?
      padding-inline-start: ${euiTheme.size.m} !important;
    }

    & .euiTreeView__node {
      position: relative;

      /* Draw the vertical line to group an expanded item's child items together. */
      &::after {
        position: absolute;
        content: '';
        ${logicalCSS('vertical', 0)}
        ${logicalCSS('left', 0)}
        ${logicalCSS('border-left', euiTheme.border.thin)}
      }

      /* If this is actually the last item, we don't want the vertical line to stretch all the way down */
      &:last-of-type::after {
        ${logicalCSS('height', '14px')}
      }
    }

    & > ul > li {
      // for the first level of the tree, we don't want lines
      &::after {
        display: none;
      }
      & > .euiTreeView__nodeInner::after {
        display: none;
      }
    }
  `,
};
