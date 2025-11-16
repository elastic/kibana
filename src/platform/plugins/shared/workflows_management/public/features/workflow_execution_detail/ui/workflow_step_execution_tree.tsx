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
  transparentize,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { JsonValue } from '@kbn/utility-types';
import type { WorkflowExecutionDto, WorkflowStepExecutionDto, WorkflowYaml } from '@kbn/workflows';
import {
  ExecutionStatus,
  isDangerousStatus,
  isInProgressStatus,
  isTerminalStatus,
} from '@kbn/workflows';
import type { StepExecutionTreeItem } from './build_step_executions_tree';
import { buildStepExecutionsTree } from './build_step_executions_tree';
import { StepExecutionTreeItemLabel } from './step_execution_tree_item_label';
import { StepIcon } from '../../../shared/ui/step_icons/step_icon';

function convertTreeToEuiTreeViewItems(
  treeItems: StepExecutionTreeItem[],
  stepExecutionMap: Map<string, WorkflowStepExecutionDto>,
  euiTheme: EuiThemeComputed,
  selectedId: string | null,
  onSelectStepExecution: (stepExecutionId: string) => void
): EuiTreeViewProps['items'] {
  return treeItems.map((item) => {
    const stepExecution = stepExecutionMap.get(item.stepExecutionId ?? '');
    const status = stepExecution?.status;
    const selected = selectedId === stepExecution?.id;

    const selectStepExecution: React.MouseEventHandler = (e) => {
      // Prevent the click event from bubbling up to the tree view item so that the tree view item is not expanded/collapsed when selected
      e.preventDefault();
      e.stopPropagation();
      if (stepExecution?.id) {
        onSelectStepExecution(stepExecution.id);
      }
    };

    return {
      id: item.stepExecutionId ?? `${item.stepId}-${item.executionIndex}-no-step-execution`,
      css: getStatusCss({ status, selected }, euiTheme),
      icon: (
        <StepIcon
          stepType={item.stepType}
          executionStatus={status ?? null}
          onClick={selectStepExecution}
        />
      ),
      label: (
        <StepExecutionTreeItemLabel
          stepId={item.stepId}
          stepType={item.stepType}
          selected={selected}
          status={status}
          executionIndex={item.executionIndex}
          executionTimeMs={stepExecution?.executionTimeMs ?? null}
          onClick={selectStepExecution}
        />
      ),
      children:
        item.children.length > 0
          ? convertTreeToEuiTreeViewItems(
              item.children,
              stepExecutionMap,
              euiTheme,
              selectedId,
              onSelectStepExecution
            )
          : undefined,
      callback:
        // collapse/expand the tree view item when the button is clicked
        () => {
          let toOpen = item.stepExecutionId;
          if (!toOpen && item.children.length) {
            toOpen = item.children[0].stepExecutionId;
          }
          if (toOpen) {
            onSelectStepExecution(toOpen);
          }
          return toOpen ?? '';
        },
    };
  });
}

export interface WorkflowStepExecutionTreeProps {
  execution: WorkflowExecutionDto | null;
  definition: WorkflowYaml | null;
  error: Error | null;
  onStepExecutionClick: (stepExecutionId: string) => void;
  selectedId: string | null;
}

const emptyPromptCommonProps: EuiEmptyPromptProps = { titleSize: 'xs', paddingSize: 's' };

export const WorkflowStepExecutionTree = ({
  error,
  execution,
  definition,
  onStepExecutionClick,
  selectedId,
}: WorkflowStepExecutionTreeProps) => {
  const styles = useMemoCss(componentStyles);
  const { euiTheme } = useEuiTheme();

  if (!execution) {
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
    const stepExecutionNameMap = new Map<string, WorkflowStepExecutionDto>();
    const stepExecutionMap = new Map<string, WorkflowStepExecutionDto>();

    for (const stepExecution of execution.stepExecutions) {
      stepExecutionNameMap.set(stepExecution.stepId, stepExecution);
      stepExecutionMap.set(stepExecution.id, stepExecution);
    }

    if (!isTerminalStatus(execution.status)) {
      definition.steps
        .filter((step) => !stepExecutionNameMap.has(step.name)) // we put skeletons only for steps without execution
        .filter((step) => !execution.stepId || step.name === execution.stepId) // we create skeletons only for the executed step and its children
        .map((step, index) => ({
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
        }))
        .forEach((skeletonStepExecution) =>
          stepExecutionMap.set(skeletonStepExecution.id, skeletonStepExecution)
        );
    }

    const stepExecutionsTree = buildStepExecutionsTree(
      Array.from(stepExecutionMap.values()),
      execution.context
    );

    const triggerPseudoStep = stepExecutionsTree.find((item) => item.stepType === '__trigger');
    const inputsPseudoStep = stepExecutionsTree.find((item) => item.stepType === '__inputs');
    const triggerStep = triggerPseudoStep ?? inputsPseudoStep;

    if (triggerStep && execution.context) {
      let triggerType: 'alert' | 'scheduled' | 'manual' = 'alert';

      const isScheduled = (execution.context.event as { type?: string })?.type === 'scheduled';
      const hasInputs =
        execution.context.inputs && Object.keys(execution.context.inputs).length > 0;

      if (!triggerPseudoStep && hasInputs) {
        triggerType = 'manual';
      } else if (isScheduled) {
        triggerType = 'scheduled';
      }

      const capitalizedTriggerType = triggerType.charAt(0).toUpperCase() + triggerType.slice(1);
      const inputData = execution.context.event || execution.context.inputs;

      const { inputs, event, ...contextData } = execution.context;

      const triggerExecution: WorkflowStepExecutionDto = {
        id: 'trigger',
        stepId: capitalizedTriggerType,
        stepType: `trigger_${triggerType}`,
        status: ExecutionStatus.COMPLETED,
        input: inputData as JsonValue,
        output: contextData as JsonValue,
        scopeStack: [],
        workflowRunId: execution.id,
        workflowId: execution.workflowId || '',
        startedAt: '',
        globalExecutionIndex: -1,
        stepExecutionIndex: 0,
        topologicalIndex: -1,
      };
      stepExecutionMap.set(triggerExecution.id, triggerExecution);
      triggerStep.stepExecutionId = triggerExecution.id;
      triggerStep.stepId = triggerExecution.stepId;
      triggerStep.stepType = `trigger_${triggerType}`;
    }
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

const getStatusCss = (
  { status, selected }: { status?: ExecutionStatus; selected?: boolean },
  euiTheme: EuiThemeComputed
) => {
  if (!status) {
    return;
  }
  let background = euiTheme.colors.backgroundLightPrimary;
  if (isDangerousStatus(status)) {
    background = euiTheme.colors.backgroundBaseDanger;
  }

  if (selected) {
    return css`
      &,
      &:active,
      &:focus,
      &:hover {
        background-color: ${background};
      }
    `;
  }

  return css`
    &:hover {
      background-color: ${transparentize(background, 0.4)};
    }
  `;
};
