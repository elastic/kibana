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
import type {
  WorkflowExecutionDto,
  WorkflowStepExecutionDto,
  WorkflowYaml,
} from '@kbn/workflows';
import {
  ExecutionStatus,
  isDangerousStatus,
  isFailedBeforeSteps,
  isInProgressStatus,
  isTerminalStatus,
} from '@kbn/workflows';
import type { StepExecutionTreeItem } from './build_step_executions_tree';
import { buildStepExecutionsTree, injectChildWorkflowSteps } from './build_step_executions_tree';
import { StepExecutionTreeItemLabel } from './step_execution_tree_item_label';
import {
  buildTriggerStepExecutionFromContext,
} from './workflow_pseudo_step_context';
import { StepIcon } from '../../../shared/ui/step_icons/step_icon';
import type { ChildWorkflowExecutionsMap } from '../model/use_child_workflow_executions';

const TRIGGER_BOLT_ICON_SVG =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><path fill="%23535966" d="M7.04 13.274a.5.5 0 1 0 .892.453l3.014-5.931a.5.5 0 0 0-.445-.727H5.316L8.03 1.727a.5.5 0 1 0-.892-.453L4.055 7.343a.5.5 0 0 0 .446.726h5.185L7.04 13.274Z"/></svg>';


function convertTreeToEuiTreeViewItems(
  treeItems: StepExecutionTreeItem[],
  stepExecutionMap: Map<string, WorkflowStepExecutionDto>,
  euiTheme: EuiThemeComputed,
  selectedId: string | null,
  onSelectStepExecution: (stepExecutionId: string) => void,
  expandedForeachIds: Set<string>,
  onToggleForeach: (id: string) => void
): EuiTreeViewProps['items'] {
  return treeItems.map((item) => {
    const stepExecution = stepExecutionMap.get(item.stepExecutionId ?? '');
    const status = (stepExecution?.status ?? item.status) ?? undefined;

    // If-branch nodes have no real step execution; give them a stable virtual ID
    const ifBranchVirtualId =
      item.stepType === 'if-branch' && !stepExecution
        ? `if-branch:${item.stepId}:${item.executionIndex}`
        : null;
    const selected = ifBranchVirtualId
      ? selectedId === ifBranchVirtualId
      : selectedId === stepExecution?.id;

    const stepId = stepExecution?.stepId ?? item.stepId;
    const stepType = stepExecution?.stepType ?? item.stepType;

    // Check if this is a skeleton step (not yet received from server) or a loading placeholder
    const isSkeletonStep =
      (stepExecution?.id?.startsWith('skeleton-') ?? false) || stepType === '__loading';

    const selectStepExecution: React.MouseEventHandler = (e) => {
      // Prevent the click event from bubbling up to the tree view item so that the tree view item is not expanded/collapsed when selected
      e.preventDefault();
      e.stopPropagation();
      // Don't allow selecting skeleton steps
      if (stepExecution?.id) {
        onSelectStepExecution(stepExecution.id);
      } else if (ifBranchVirtualId) {
        onSelectStepExecution(ifBranchVirtualId);
      }
    };

    // Check if this is a trigger pseudo-step
    const isTriggerPseudoStep = stepType.startsWith('trigger_');

    return {
      id: item.stepExecutionId ?? ifBranchVirtualId ?? `${item.stepId}-${item.executionIndex}-no-step-execution`,
      css: [
        getStatusCss({ status, selected }, euiTheme),
        // Don't allow selecting skeleton steps using css, as we don't have a 'disabled' prop on the tree view item
        isSkeletonStep &&
          css`
            pointer-events: none;
            cursor: not-allowed;
          `,
        isTriggerPseudoStep &&
          css`
            .euiTreeView__arrowPlaceholder::before {
              content: '';
              display: inline-block;
              width: 16px;
              height: 16px;
              background-image: url('${TRIGGER_BOLT_ICON_SVG}');
              background-repeat: no-repeat;
              background-position: center;
              background-size: 12px 12px;
            }
          `,
      ],
      icon: (
        <StepIcon
          stepType={stepType}
          executionStatus={status ?? null}
          onClick={selectStepExecution}
        />
      ),
      label: (
        <StepExecutionTreeItemLabel
          stepId={stepId}
          selected={selected}
          status={status}
          executionTimeMs={stepExecution?.executionTimeMs ?? null}
          onClick={selectStepExecution}
          attemptNumber={item.attemptNumber}
        />
      ),
      children: (() => {
        if (item.children.length === 0) return undefined;

        // Detect foreach/while iteration children (have attemptNumber set by flattenIfBranches)
        const foreachChildAttempts = item.children
          .map((c) => c.attemptNumber)
          .filter((n): n is number => n !== undefined);

        if (foreachChildAttempts.length > 0) {
          const foreachParentId =
            item.stepExecutionId ?? `${item.stepId}-${item.executionIndex}`;
          const isExpanded = expandedForeachIds.has(foreachParentId);
          const uniqueAttempts = [...new Set(foreachChildAttempts)];
          const maxAttempt = Math.max(...uniqueAttempts);
          const lastIterChildren = item.children.filter(
            (c) => c.attemptNumber === maxAttempt
          );
          const hiddenAttempts = uniqueAttempts.filter((n) => n !== maxAttempt).sort((a, b) => a - b);
          const hiddenIterationCount = hiddenAttempts.length;
          const minHidden = hiddenAttempts[0];
          const maxHidden = hiddenAttempts[hiddenAttempts.length - 1];

          const visibleChildren = isExpanded ? item.children : lastIterChildren;
          const euiVisibleChildren = convertTreeToEuiTreeViewItems(
            visibleChildren,
            stepExecutionMap,
            euiTheme,
            selectedId,
            onSelectStepExecution,
            expandedForeachIds,
            onToggleForeach
          );

          if (!isExpanded && hiddenIterationCount > 0) {
            const handleExpand: React.MouseEventHandler = (e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleForeach(foreachParentId);
            };
            const expandButtonItem: EuiTreeViewProps['items'][number] = {
              id: `foreach-expand-${foreachParentId}`,
              icon: (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  onClick={handleExpand}
                  aria-hidden={true}
                  css={css({ cursor: 'pointer', flexShrink: 0, color: euiTheme.colors.vis.euiColorVisSuccess0 })}
                >
                  <path
                    d="M1 14L15 14V15L1 15L1 14ZM1 1L15 1V2L1 2L1 1ZM4 10L12 10V6L4 6L4 10ZM12 5C12.5523 5 13 5.44771 13 6V10C13 10.5523 12.5523 11 12 11L4 11C3.44772 11 3 10.5523 3 10L3 6C3 5.44772 3.44772 5 4 5L12 5Z"
                    fill="currentColor"
                  />
                </svg>
              ),
              label: (
                <div
                  onClick={handleExpand}
                  css={css({
                    display: 'flex',
                    alignItems: 'center',
                    gap: euiTheme.size.s,
                    cursor: 'pointer',
                    width: '100%',
                    fontSize: `${euiTheme.font.scale.s * euiTheme.base}px`,
                    lineHeight: euiTheme.font.lineHeightMultiplier,
                  })}
                >
                  <span css={css({ flexShrink: 0, color: euiTheme.colors.textSubdued, fontVariantNumeric: 'tabular-nums' })}>
                    #{minHidden}-{maxHidden}
                  </span>
                  <div
                    css={css({
                      flex: '1 1 auto',
                      height: 0,
                      borderTop: euiTheme.border.thin,
                      alignSelf: 'center',
                    })}
                  />
                </div>
              ),
              callback: () => {
                onToggleForeach(foreachParentId);
                return foreachParentId;
              },
            };
            return [expandButtonItem, ...euiVisibleChildren];
          }

          return euiVisibleChildren;
        }

        return convertTreeToEuiTreeViewItems(
          item.children,
          stepExecutionMap,
          euiTheme,
          selectedId,
          onSelectStepExecution,
          expandedForeachIds,
          onToggleForeach
        );
      })(),
      callback:
        // collapse/expand the tree view item when the button is clicked
        () => {
          let toOpen = item.stepExecutionId ?? ifBranchVirtualId;
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
  childExecutionsMap?: ChildWorkflowExecutionsMap;
  isLoadingChildExecutions?: boolean;
  searchQuery?: string;
}

const filterStepTree = (
  items: StepExecutionTreeItem[],
  query: string
): StepExecutionTreeItem[] => {
  const lower = query.toLowerCase();
  return items.reduce<StepExecutionTreeItem[]>((acc, item) => {
    const filteredChildren = filterStepTree(item.children, query);
    if (item.stepId.toLowerCase().includes(lower) || filteredChildren.length > 0) {
      acc.push({ ...item, children: filteredChildren });
    }
    return acc;
  }, []);
};

// Flatten virtual container nodes (if-branch, foreach-iteration, while-iteration):
// - if-branch: promote branch label as a leaf, hoist its children to the same level
// - foreach/while-iteration: skip the container, hoist children with the iteration index as attemptNumber
const flattenIfBranches = (items: StepExecutionTreeItem[]): StepExecutionTreeItem[] =>
  items.flatMap((item) => {
    if (item.stepType === 'if-branch') {
      const branchTaken = item.children.some((c) => c.stepExecutionId != null);
      return [
        { ...item, status: branchTaken ? ExecutionStatus.COMPLETED : ExecutionStatus.SKIPPED, children: [] },
        ...flattenIfBranches(item.children),
      ];
    }
    if (item.stepType === 'foreach-iteration' || item.stepType === 'while-iteration') {
      const iterationIndex = parseInt(item.stepId, 10);
      const hoistedChildren = item.children.map((child) => ({
        ...child,
        attemptNumber: isNaN(iterationIndex) ? undefined : iterationIndex,
      }));
      return flattenIfBranches(hoistedChildren);
    }
    return [{ ...item, children: flattenIfBranches(item.children) }];
  });

const emptyPromptCommonProps: EuiEmptyPromptProps = { titleSize: 'xs', paddingSize: 's' };

export const WorkflowStepExecutionTree = ({
  error,
  execution,
  definition,
  onStepExecutionClick,
  selectedId,
  childExecutionsMap,
  isLoadingChildExecutions,
  searchQuery,
}: WorkflowStepExecutionTreeProps) => {
  const styles = useMemoCss(componentStyles);
  const { euiTheme } = useEuiTheme();
  const [expandedForeachIds, setExpandedForeachIds] = React.useState<Set<string>>(new Set());
  const onToggleForeach = React.useCallback((id: string) => {
    setExpandedForeachIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const failedBeforeSteps =
    execution != null && isFailedBeforeSteps(execution.status, execution.stepExecutions);

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
        icon={<EuiIcon type="error" size="l" aria-hidden={true} />}
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
  } else if (
    execution?.stepExecutions?.length === 0 &&
    !isInProgressStatus(execution?.status) &&
    !failedBeforeSteps
  ) {
    return (
      <EuiEmptyPrompt
        {...emptyPromptCommonProps}
        icon={<EuiIcon type="listBullet" size="l" />}
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

    if (!isTerminalStatus(execution.status) || failedBeforeSteps) {
      definition.steps
        .filter((step) => !stepExecutionNameMap.has(step.name)) // we put skeletons only for steps without execution
        .filter((step) => !execution.stepId || step.name === execution.stepId) // we create skeletons only for the executed step and its children
        .map((step, index) => ({
          stepId: step.name,
          stepType: step.type,
          status: 'pending' as WorkflowStepExecutionDto['status'],
          id: `skeleton-${step.name}-${step.type}-${index}`,
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

    let stepExecutionsTree = buildStepExecutionsTree(
      Array.from(stepExecutionMap.values()),
      execution.context,
      execution.status,
      execution.triggeredBy
    );

    const { tree: treeWithChildren, childStepExecutions } = injectChildWorkflowSteps(
      stepExecutionsTree,
      childExecutionsMap ?? new Map(),
      isLoadingChildExecutions ?? false
    );
    stepExecutionsTree = treeWithChildren;
    for (const childStep of childStepExecutions) {
      stepExecutionMap.set(childStep.id, childStep);
    }

    const triggerPseudoStep =
      stepExecutionsTree.find((item) => item.stepType === '__trigger') ??
      stepExecutionsTree.find((item) => item.stepType === '__inputs');

    if (triggerPseudoStep && execution.context) {
      const triggerExecution = buildTriggerStepExecutionFromContext(execution);
      if (triggerExecution) {
        stepExecutionMap.set(triggerExecution.id, triggerExecution);
        triggerPseudoStep.stepExecutionId = triggerExecution.id;
        triggerPseudoStep.stepType = triggerExecution.stepType ?? '';
      }
    }
    const visibleTree = stepExecutionsTree.filter((item) => item.stepType !== '__overview');
    const filteredTree = searchQuery ? filterStepTree(visibleTree, searchQuery) : visibleTree;
    const flatTree = flattenIfBranches(filteredTree);

    const items: EuiTreeViewProps['items'] = convertTreeToEuiTreeViewItems(
      flatTree,
      stepExecutionMap,
      euiTheme,
      selectedId,
      onStepExecutionClick,
      expandedForeachIds,
      onToggleForeach
    );

    return (
      <>
        <div css={styles.treeViewContainer}>
          {items.length > 0 && (
            <EuiTreeView
              data-test-subj="workflowStepExecutionTree"
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
          )}
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
    & .euiTreeView__expansionArrow {
      inline-size: 12px;
    }
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

      /*
       * Override EUI's max-block-size: 100vh on expanded tree nodes.
       * Without this, expanded foreach nodes with many iterations get clipped
       * to the viewport height, causing sibling nodes after them to overlap
       * and appear interleaved between the last children.
       * See: https://github.com/elastic/eui/issues/9395
       */
      ${logicalCSS('max-height', 'none')}

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
