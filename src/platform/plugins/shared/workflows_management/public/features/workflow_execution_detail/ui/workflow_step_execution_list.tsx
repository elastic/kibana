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
} from '@elastic/eui';
import React, { useRef } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EsWorkflowStepExecution, WorkflowExecutionDto, WorkflowYaml } from '@kbn/workflows';
import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import {
  convertToWorkflowGraph,
  getNestedStepsFromGraph,
  type StepListTreeItem,
} from '@kbn/workflows/graph';
import { StepExecutionTreeItemLabel } from './step_execution_tree_item_label';
import { getStepIconType } from '../../../shared/ui/get_step_icon_type';
import { getExecutionStatusColors } from '../../../shared/ui/status_badge';

function transformWorkflowDefinitionToStepListTree(
  workflowDefinition: WorkflowYaml
): StepListTreeItem[] {
  const workflowExecutionGraph = convertToWorkflowGraph(workflowDefinition);
  return getNestedStepsFromGraph(workflowExecutionGraph);
}

function convertTreeToEuiTreeViewItems(
  treeItems: StepListTreeItem[],
  stepExecutionMap: Map<string, EsWorkflowStepExecution[]>,
  euiTheme: EuiThemeComputed,
  selectedId: string | null,
  onClickHandler: (stepExecutionId: string) => void
): EuiTreeViewProps['items'] {
  const onClickFn = onClickHandler;
  return treeItems
    .map((item) => {
      const stepExecutions = stepExecutionMap.get(item.stepId);
      if (!stepExecutions) {
        return [];
      }
      return stepExecutions.map((stepExecution) => ({
        id: stepExecution.id,
        sortIndex: stepExecution.executionIndex,
        icon: (
          <EuiIcon
            type={getStepIconType(item.stepType)}
            color={getExecutionStatusColors(euiTheme, stepExecution.status).color}
          />
        ),
        label: (
          <StepExecutionTreeItemLabel
            stepExecution={stepExecution}
            stepType={item.stepType}
            selected={selectedId === stepExecution.id}
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
        callback: () => {
          onClickFn(stepExecution.id);
          // string is expected by EuiTreeView for some reason
          return stepExecution.id;
        },
      }));
    })
    .flat()
    .sort((a, b) => a.sortIndex - b.sortIndex);
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
  const treeViewRef = useRef<typeof EuiTreeView | null>(null);

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
    const stepExecutionMap = new Map<string, EsWorkflowStepExecution[]>();
    for (const stepExecution of execution.stepExecutions) {
      if (stepExecutionMap.has(stepExecution.stepId)) {
        stepExecutionMap.get(stepExecution.stepId)?.push(stepExecution);
      } else {
        stepExecutionMap.set(stepExecution.stepId, [stepExecution]);
      }
    }
    const stepListTree = transformWorkflowDefinitionToStepListTree(execution.workflowDefinition);
    const items: EuiTreeViewProps['items'] = convertTreeToEuiTreeViewItems(
      stepListTree,
      stepExecutionMap,
      euiTheme,
      selectedId,
      onStepExecutionClick
    );
    content = (
      <EuiFlexGroup direction="column" gutterSize="s" justifyContent="spaceBetween">
        <div css={styles.treeViewContainer}>
          <EuiTreeView items={items} showExpansionArrows expandByDefault display="compressed" />
        </div>
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
    display: 'flex',
    alignItems: 'center',
  }),
  doneButton: css({
    justifySelf: 'flex-end',
    marginTop: 'auto',
  }),
  treeViewContainer: css({
    '& .euiTreeView__nodeLabel': {
      flexGrow: 1,
      textAlign: 'left',
    },
  }),
};
