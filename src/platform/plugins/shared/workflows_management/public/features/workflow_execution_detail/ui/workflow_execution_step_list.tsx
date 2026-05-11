/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiEmptyPrompt, EuiIcon, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { WorkflowExecutionDto, WorkflowStepExecutionDto, WorkflowYaml } from '@kbn/workflows';
import {
  isDangerousStatus,
  isFailedBeforeSteps,
  isInProgressStatus,
  isTerminalStatus,
} from '@kbn/workflows';
import type { StepExecutionTreeItem } from './build_step_executions_tree';
import { buildStepExecutionsTree, injectChildWorkflowSteps } from './build_step_executions_tree';
import { StepExecutionInlineBody } from './step_execution_inline_body';
import { StepExecutionRow } from './step_execution_row';
import {
  buildOverviewStepExecutionFromContext,
  buildTriggerStepExecutionFromContext,
} from './workflow_pseudo_step_context';
import type { ChildWorkflowExecutionsMap } from '../model/use_child_workflow_executions';

const emptyPromptCommonProps = { titleSize: 'xs', paddingSize: 's' } as const;

export interface WorkflowExecutionStepListProps {
  execution: WorkflowExecutionDto | null;
  definition: WorkflowYaml | null;
  error: Error | null;
  expandedStepExecutionId: string | null;
  expandedStepData: WorkflowStepExecutionDto | undefined;
  isExpandedStepDataLoading: boolean;
  onToggleStepExpansion: (stepExecutionId: string) => void;
  childExecutionsMap?: ChildWorkflowExecutionsMap;
  isLoadingChildExecutions?: boolean;
}

export const WorkflowExecutionStepList = React.memo<WorkflowExecutionStepListProps>(
  ({
    execution,
    definition,
    error,
    expandedStepExecutionId,
    expandedStepData,
    isExpandedStepDataLoading,
    onToggleStepExpansion,
    childExecutionsMap,
    isLoadingChildExecutions,
  }) => {
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
                id="workflows.workflowExecutionStepList.loadingStepExecutions"
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
          icon={<EuiIcon type="error" size="l" aria-hidden={true} />}
          title={
            <h2>
              <FormattedMessage
                id="workflows.workflowExecutionStepList.errorLoadingStepExecutions"
                defaultMessage="Error loading step executions"
              />
            </h2>
          }
          body={<EuiText>{error.message}</EuiText>}
        />
      );
    }
    if (
      execution.stepExecutions?.length === 0 &&
      !isInProgressStatus(execution.status) &&
      !failedBeforeSteps
    ) {
      return (
        <EuiEmptyPrompt
          {...emptyPromptCommonProps}
          icon={<EuiIcon type="listBullet" size="l" aria-hidden={true} />}
          title={
            <h2>
              <FormattedMessage
                id="workflows.workflowExecutionStepList.noExecutionFound"
                defaultMessage="No step executions found"
              />
            </h2>
          }
        />
      );
    }
    if (!definition) {
      return (
        <EuiEmptyPrompt
          {...emptyPromptCommonProps}
          icon={<EuiIcon type="error" size="l" aria-hidden={true} />}
          title={
            <h2>
              <FormattedMessage
                id="workflows.workflowExecutionStepList.errorLoadingExecutionGraph"
                defaultMessage="Error loading execution graph"
              />
            </h2>
          }
        />
      );
    }

    const stepExecutionNameMap = new Map<string, WorkflowStepExecutionDto>();
    const stepExecutionMap = new Map<string, WorkflowStepExecutionDto>();

    for (const stepExecution of execution.stepExecutions) {
      stepExecutionNameMap.set(stepExecution.stepId, stepExecution);
      stepExecutionMap.set(stepExecution.id, stepExecution);
    }

    if (!isTerminalStatus(execution.status) || failedBeforeSteps) {
      definition.steps
        .filter((step) => !stepExecutionNameMap.has(step.name))
        .filter((step) => !execution.stepId || step.name === execution.stepId)
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

    const overviewPseudoStep = stepExecutionsTree.find((item) => item.stepType === '__overview');
    if (overviewPseudoStep) {
      const overview = buildOverviewStepExecutionFromContext(execution);
      stepExecutionMap.set('__overview', overview);
    }

    // The mockup-style header now shows the overview info, so we omit the
    // overview pseudo-step from the inline list.
    const renderableTree = stepExecutionsTree.filter((item) => item.stepType !== '__overview');

    return (
      <div data-test-subj="workflowExecutionStepList">
        {renderableTree.map((item, idx) => (
          <StepListItem
            key={`${item.stepId}-${item.executionIndex}-${idx}`}
            item={item}
            stepExecutionMap={stepExecutionMap}
            depth={0}
            expandedStepExecutionId={expandedStepExecutionId}
            expandedStepData={expandedStepData}
            isExpandedStepDataLoading={isExpandedStepDataLoading}
            onToggleStepExpansion={onToggleStepExpansion}
          />
        ))}
      </div>
    );
  }
);
WorkflowExecutionStepList.displayName = 'WorkflowExecutionStepList';

interface StepListItemProps {
  item: StepExecutionTreeItem;
  stepExecutionMap: Map<string, WorkflowStepExecutionDto>;
  depth: number;
  expandedStepExecutionId: string | null;
  expandedStepData: WorkflowStepExecutionDto | undefined;
  isExpandedStepDataLoading: boolean;
  onToggleStepExpansion: (stepExecutionId: string) => void;
}

const StepListItem = React.memo<StepListItemProps>(
  ({
    item,
    stepExecutionMap,
    depth,
    expandedStepExecutionId,
    expandedStepData,
    isExpandedStepDataLoading,
    onToggleStepExpansion,
  }) => {
    const stepExecution = stepExecutionMap.get(item.stepExecutionId ?? '');
    const stepId = stepExecution?.stepId ?? item.stepId;
    const stepType = stepExecution?.stepType ?? item.stepType;
    const isSkeleton =
      (stepExecution?.id?.startsWith('skeleton-') ?? false) || stepType === '__loading';
    const hasChildren = item.children.length > 0;
    const isLeafExpanded = expandedStepExecutionId === stepExecution?.id;

    // Containers default to collapsed, but auto-expand when any descendant is dangerous
    // (failed/timed-out/cancelled) or in progress (running/waiting), so the user always
    // sees the relevant state without clicking. Once they click, their choice wins.
    const autoOpen = useMemo(
      () => hasChildren && hasNotableDescendant(item, stepExecutionMap),
      [hasChildren, item, stepExecutionMap]
    );
    const [userOverride, setUserOverride] = useState<boolean | null>(null);
    const isContainerOpen = userOverride ?? autoOpen;

    // A row is expandable if it has children (container) OR a real step execution to
    // show data for. Iteration markers (foreach-iteration) often lack their own
    // stepExecution but still group children, so we need the `hasChildren` branch.
    const isExpandable = !isSkeleton && (hasChildren || Boolean(stepExecution?.id));
    const isExpanded = hasChildren ? isContainerOpen : isLeafExpanded;

    const handleToggle = () => {
      if (!isExpandable) return;
      if (hasChildren) {
        setUserOverride(!isContainerOpen);
      } else if (stepExecution?.id) {
        onToggleStepExpansion(stepExecution.id);
      }
    };

    return (
      <>
        <StepExecutionRow
          stepExecution={stepExecution}
          stepId={stepId}
          stepType={stepType}
          depth={depth}
          isExpanded={isExpanded}
          isExpandable={isExpandable}
          onToggle={handleToggle}
          childCount={hasChildren ? item.children.length : undefined}
          expandedContent={
            // Container rows toggle children visibility (rendered below); leaf rows
            // render their input/output inside the row's own collapsible body.
            !hasChildren && isLeafExpanded ? (
              <StepExecutionInlineBody
                stepExecution={expandedStepData ?? stepExecution}
                isLoading={isExpandedStepDataLoading}
              />
            ) : null
          }
        />
        {hasChildren ? (
          <div
            css={[childrenStyles.collapsible, isContainerOpen && childrenStyles.collapsibleOpen]}
            aria-hidden={!isContainerOpen}
          >
            <div
              css={[
                childrenStyles.collapsibleInner,
                isContainerOpen && childrenStyles.collapsibleInnerOpen,
              ]}
            >
              {item.children.map((child, idx) => (
                <StepListItem
                  key={`${child.stepId}-${child.executionIndex}-${idx}`}
                  item={child}
                  stepExecutionMap={stepExecutionMap}
                  depth={depth + 1}
                  expandedStepExecutionId={expandedStepExecutionId}
                  expandedStepData={expandedStepData}
                  isExpandedStepDataLoading={isExpandedStepDataLoading}
                  onToggleStepExpansion={onToggleStepExpansion}
                />
              ))}
            </div>
          </div>
        ) : null}
      </>
    );
  }
);
StepListItem.displayName = 'StepListItem';

/**
 * Walk the subtree under `item` and return true if any descendant step execution
 * is in a state worth surfacing (failed/timed-out/cancelled or running/waiting).
 * Used to auto-expand container rows that hold the user's attention.
 */
function hasNotableDescendant(
  item: StepExecutionTreeItem,
  stepExecutionMap: Map<string, WorkflowStepExecutionDto>
): boolean {
  for (const child of item.children) {
    const stepExecution = stepExecutionMap.get(child.stepExecutionId ?? '');
    const status = stepExecution?.status;
    if (status && (isDangerousStatus(status) || isInProgressStatus(status))) {
      return true;
    }
    if (hasNotableDescendant(child, stepExecutionMap)) {
      return true;
    }
  }
  return false;
}

// Match the per-row collapsible motion so container expansion feels identical
// to leaf expansion.
const CHILDREN_EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';
const childrenStyles = {
  collapsible: css({
    display: 'grid',
    gridTemplateRows: '0fr',
    transition: `grid-template-rows 240ms ${CHILDREN_EASE}`,
  }),
  collapsibleOpen: css({
    gridTemplateRows: '1fr',
  }),
  collapsibleInner: css({
    overflow: 'hidden',
    opacity: 0,
    transition: `opacity 200ms ${CHILDREN_EASE}`,
  }),
  collapsibleInnerOpen: css({
    opacity: 1,
  }),
};
