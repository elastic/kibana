/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  EuiEmptyPromptProps,
  EuiThemeComputed,
  EuiTreeViewProps,
  UseEuiTheme,
} from '@elastic/eui';
import {
  EuiEmptyPrompt,
  EuiIcon,
  EuiLoadingSpinner,
  EuiText,
  EuiTreeView,
  logicalCSS,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { WorkflowExecutionDto, WorkflowStepExecutionDto, WorkflowYaml } from '@kbn/workflows';
import { ExecutionStatus, isDangerousStatus, isInProgressStatus } from '@kbn/workflows';
import type { StepExecutionTreeItem } from './build_step_executions_tree';
import { buildStepExecutionsTree } from './build_step_executions_tree';
import { StepExecutionTreeItemLabel } from './step_execution_tree_item_label';
import { getExecutionStatusColors } from '../../../shared/ui/status_badge';
import { StepIcon } from '../../../shared/ui/step_icons/step_icon';

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
    const status = stepExecution?.status || null;
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

export interface WorkflowStepExecutionTreeProps {
  execution: WorkflowExecutionDto | null;
  definition: WorkflowYaml | null;
  isLoading: boolean;
  error: Error | null;
  onStepExecutionClick: (stepExecutionId: string) => void;
  selectedId: string | null;
}

const emptyPromptCommonProps: EuiEmptyPromptProps = { titleSize: 'xs', paddingSize: 's' };

export const WorkflowStepExecutionTree = ({
  isLoading,
  error,
  execution,
  definition,
  onStepExecutionClick,
  selectedId,
}: WorkflowStepExecutionTreeProps) => {
  const styles = useMemoCss(componentStyles);
  const { euiTheme } = useEuiTheme();

  if (isLoading || !execution) {
    return (
      <EuiEmptyPrompt
        {...emptyPromptCommonProps}
        icon={<EuiLoadingSpinner size="l" />}
        title={
          <h2>
            <FormattedMessage
              id="workflows.WorkflowStepExecutionTree.loadingStepExecutions"
              defaultMessage="Loading step executions..."
            />
          </h2>
        }
      />
    );
  } else if (error) {
    return (
      <EuiEmptyPrompt
        {...emptyPromptCommonProps}
        icon={<EuiIcon type="error" size="l" />}
        title={
          <h2>
            <FormattedMessage
              id="workflows.WorkflowStepExecutionTree.errorLoadingStepExecutions"
              defaultMessage="Error loading step executions"
            />
          </h2>
        }
        body={<EuiText>{error.message}</EuiText>}
      />
    );
  } else if (execution?.stepExecutions?.length === 0 && !isInProgressStatus(execution?.status)) {
    return (
      <EuiEmptyPrompt
        {...emptyPromptCommonProps}
        icon={<EuiIcon type="list" size="l" />}
        title={
          <h2>
            <FormattedMessage
              id="workflows.WorkflowStepExecutionTree.noExecutionFound"
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
    return (
      <>
        <div css={styles.treeViewContainer}>
          <EuiTreeView
            showExpansionArrows
            expandByDefault
            items={items}
            aria-label={i18n.translate(
              'workflows.WorkflowStepExecutionTree.workflowStepExecutionTreeAriaLabel',
              {
                defaultMessage: 'Workflow step execution tree',
              }
            )}
          />
        </div>
      </>
    );
  }

  return (
    <EuiEmptyPrompt
      {...emptyPromptCommonProps}
      icon={<EuiIcon type="error" size="l" />}
      title={
        <h2>
          <FormattedMessage
            id="workflows.WorkflowStepExecutionTree.errorLoadingStepExecutions"
            defaultMessage="Error loading execution graph"
          />
        </h2>
      }
    />
  );
};

const componentStyles = {
  treeViewContainer: ({ euiTheme }: UseEuiTheme) => css`
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
