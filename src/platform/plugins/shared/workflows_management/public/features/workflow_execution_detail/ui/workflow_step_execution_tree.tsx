/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiEmptyPromptProps, UseEuiTheme } from '@elastic/eui';
import { EuiEmptyPrompt, EuiIcon, EuiLoadingSpinner, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useMemo, useState } from 'react';

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
import {
  StepExecutionTreeRow,
  TREE_ROW_CHEVRON_SLOT_PX,
  type StatusPlacement,
  type StepExecutionTreeRowProps,
} from './step_execution_tree_row';
import {
  buildOverviewStepExecutionFromContext,
  buildTriggerStepExecutionFromContext,
} from './workflow_pseudo_step_context';
import { normalizeStepAi, stepAiToTokenUsage } from '../lib/normalize_step_ai';
import { rollupTokenUsage, type TokenRollupNode } from '../lib/token_rollup';
import type { ChildWorkflowExecutionsMap } from '../model/use_child_workflow_executions';

const COLLAPSED_BY_DEFAULT_STEP_TYPES = [
  'foreach-iteration',
  'while-iteration',
  'parallel-branch',
  'enter-case-branch',
  'enter-default-branch',
];

const CONTROL_FLOW_STEP_TYPES = new Set(['foreach', 'while', 'if', 'switch', 'parallel']);

const BRANCH_LABEL_STEP_TYPES = new Set([
  'if-branch',
  'enter-case-branch',
  'enter-default-branch',
  'parallel-branch',
]);

/** Align indent guide under the chevron/icon column center. */
const INDENT_GUIDE_MARGIN_PX = Math.round(TREE_ROW_CHEVRON_SLOT_PX / 2);
const INDENT_CHILD_PADDING_PX = 14;

export interface OpenTreeNode {
  id: string;
  defaultExpanded: boolean;
  row: Omit<StepExecutionTreeRowProps, 'isExpanded' | 'onToggleExpand' | 'statusPlacement'>;
  children: OpenTreeNode[];
}

const toRollupNode = (
  item: StepExecutionTreeItem,
  stepExecutionMap: Map<string, WorkflowStepExecutionDto>
): TokenRollupNode => {
  const stepExecution = stepExecutionMap.get(item.stepExecutionId ?? '');
  return {
    ai: normalizeStepAi({ usage: stepExecution?.usage }),
    children: item.children.map((child) => toRollupNode(child, stepExecutionMap)),
  };
};

const subtreeHasDangerousStatus = (
  item: StepExecutionTreeItem,
  stepExecutionMap: Map<string, WorkflowStepExecutionDto>
): boolean => {
  for (const child of item.children) {
    const childExec = stepExecutionMap.get(child.stepExecutionId ?? '');
    const childStatus = childExec?.status ?? child.status;
    if (childStatus != null && isDangerousStatus(childStatus)) {
      return true;
    }
    if (subtreeHasDangerousStatus(child, stepExecutionMap)) {
      return true;
    }
  }
  return false;
};

function buildIterationExpandNode(
  foreachParentId: string,
  hiddenAttempts: number[],
  hiddenChildren: StepExecutionTreeItem[],
  stepExecutionMap: Map<string, WorkflowStepExecutionDto>,
  onToggleForeach: (id: string) => void
): OpenTreeNode {
  const minHidden = hiddenAttempts[0];
  const maxHidden = hiddenAttempts[hiddenAttempts.length - 1];
  const allHiddenFailed =
    hiddenChildren.length > 0 &&
    hiddenChildren.every((c) => {
      const childExec = stepExecutionMap.get(c.stepExecutionId ?? '');
      const childStatus = childExec?.status ?? c.status;
      return childStatus != null && isDangerousStatus(childStatus);
    });

  return {
    id: `foreach-expand-${foreachParentId}`,
    defaultExpanded: false,
    children: [],
    row: {
      stepId: `#${minHidden}-${maxHidden}`,
      stepType: 'foreach-iteration',
      selected: false,
      isBranchLabel: true,
      forceInteractive: true,
      showAggregateDanger: allHiddenFailed,
      onSelect: () => {
        onToggleForeach(foreachParentId);
      },
    },
  };
}

function convertTreeToOpenNodes(
  treeItems: StepExecutionTreeItem[],
  stepExecutionMap: Map<string, WorkflowStepExecutionDto>,
  selectedId: string | null,
  onSelectStepExecution: (stepExecutionId: string) => void,
  expandedForeachIds: Set<string>,
  onToggleForeach: (id: string) => void,
  options?: {
    executionUsage?: WorkflowStepExecutionDto['usage'];
    autoExpandErrorForStepId?: string | null;
  }
): OpenTreeNode[] {
  return treeItems.flatMap((item) => {
    const stepExecution = stepExecutionMap.get(item.stepExecutionId ?? '');
    const status = (stepExecution?.status ?? item.status) ?? undefined;

    const ifBranchVirtualId =
      item.stepType === 'if-branch' && !stepExecution
        ? `if-branch:${item.stepId}:${item.executionIndex}`
        : null;
    const enterCaseBranchVirtualId =
      item.stepType === 'enter-case-branch' && !stepExecution
        ? `enter-case-branch:${item.stepId}:${item.executionIndex}:${
            item.status ?? ExecutionStatus.COMPLETED
          }`
        : null;
    const selected = ifBranchVirtualId
      ? selectedId === ifBranchVirtualId
      : enterCaseBranchVirtualId
      ? selectedId === enterCaseBranchVirtualId
      : selectedId === stepExecution?.id;

    const stepId = stepExecution?.stepId ?? item.stepId;
    const stepType = stepExecution?.stepType ?? item.stepType ?? '';
    const isTriggerPseudoStep = stepType.startsWith('trigger_');
    const triggerDisplayLabel = isTriggerPseudoStep
      ? i18n.translate('workflows.WorkflowStepExecutionTree.triggerLabel', {
          defaultMessage: '{type} trigger',
          values: {
            type:
              stepType === 'trigger_manual'
                ? i18n.translate('workflows.WorkflowStepExecutionTree.triggerManual', {
                    defaultMessage: 'Manual',
                  })
                : stepType === 'trigger_alert'
                ? i18n.translate('workflows.WorkflowStepExecutionTree.triggerAlert', {
                    defaultMessage: 'Alert',
                  })
                : stepType === 'trigger_scheduled'
                ? i18n.translate('workflows.WorkflowStepExecutionTree.triggerScheduled', {
                    defaultMessage: 'Scheduled',
                  })
                : stepType.replace(/^trigger_/, ''),
          },
        })
      : undefined;
    const displayLabel = triggerDisplayLabel ?? item.displayLabel ?? stepId;

    const isSkeletonStep =
      (stepExecution?.id?.startsWith('skeleton-') ?? false) || stepType === '__loading';

    const isBranchLabel = BRANCH_LABEL_STEP_TYPES.has(stepType);

    const rolledUsage = (() => {
      if (isTriggerPseudoStep) {
        return options?.executionUsage;
      }
      if (stepExecution?.usage) {
        return stepExecution.usage;
      }
      if (CONTROL_FLOW_STEP_TYPES.has(stepType) && item.children.length > 0) {
        const rollup = rollupTokenUsage(toRollupNode(item, stepExecutionMap));
        return stepAiToTokenUsage({
          inputTokens: rollup.inputTokens,
          outputTokens: rollup.outputTokens,
          totalTokens: rollup.totalTokens,
          callCount: rollup.callCount,
        });
      }
      return undefined;
    })();
    const rolledCallCount = (() => {
      if (!CONTROL_FLOW_STEP_TYPES.has(stepType) || stepExecution?.usage) return undefined;
      const rollup = rollupTokenUsage(toRollupNode(item, stepExecutionMap));
      return rollup.callCount > 1 ? rollup.callCount : undefined;
    })();

    const selectStep = () => {
      if (stepExecution?.id) {
        onSelectStepExecution(stepExecution.id);
      } else if (ifBranchVirtualId) {
        onSelectStepExecution(ifBranchVirtualId);
      } else if (enterCaseBranchVirtualId) {
        onSelectStepExecution(enterCaseBranchVirtualId);
      } else if (item.children.length > 0) {
        const firstChildId = item.children[0].stepExecutionId;
        if (firstChildId) {
          onSelectStepExecution(firstChildId);
        }
      }
    };

    const foreachChildAttempts = item.children
      .map((c) => c.attemptNumber)
      .filter((n): n is number => n !== undefined);

    const isForeachOrWhileParent = stepType === 'foreach' || stepType === 'while';

    if (foreachChildAttempts.length > 0 && !isForeachOrWhileParent) {
      const foreachParentId = item.stepExecutionId ?? `${item.stepId}-${item.executionIndex}`;
      const isExpanded = expandedForeachIds.has(foreachParentId);
      const uniqueAttempts = [...new Set(foreachChildAttempts)];
      const maxAttempt = Math.max(...uniqueAttempts);
      const lastIterChildren = item.children.filter((c) => c.attemptNumber === maxAttempt);
      const hiddenAttempts = uniqueAttempts.filter((n) => n !== maxAttempt).sort((a, b) => a - b);

      const visibleChildren = isExpanded ? item.children : lastIterChildren;
      const childNodes = convertTreeToOpenNodes(
        visibleChildren,
        stepExecutionMap,
        selectedId,
        onSelectStepExecution,
        expandedForeachIds,
        onToggleForeach,
        options
      );

      if (!isExpanded && hiddenAttempts.length > 0) {
        const hiddenChildren = item.children.filter(
          (c) => c.attemptNumber !== undefined && hiddenAttempts.includes(c.attemptNumber)
        );
        return [
          buildIterationExpandNode(
            foreachParentId,
            hiddenAttempts,
            hiddenChildren,
            stepExecutionMap,
            onToggleForeach
          ),
          ...childNodes,
        ];
      }

      return childNodes;
    }

    const nodeId =
      item.stepExecutionId ??
      ifBranchVirtualId ??
      enterCaseBranchVirtualId ??
      `${item.stepId}-${item.executionIndex}-no-step-execution`;

    const childNodesForParent = (() => {
      if (item.children.length === 0) return [] as OpenTreeNode[];

      if (foreachChildAttempts.length > 0 && isForeachOrWhileParent) {
        const foreachParentId = item.stepExecutionId ?? `${item.stepId}-${item.executionIndex}`;
        const isExpanded = expandedForeachIds.has(foreachParentId);
        const uniqueAttempts = [...new Set(foreachChildAttempts)];
        const maxAttempt = Math.max(...uniqueAttempts);
        const lastIterChildren = item.children.filter((c) => c.attemptNumber === maxAttempt);
        const hiddenAttempts = uniqueAttempts
          .filter((n) => n !== maxAttempt)
          .sort((a, b) => a - b);

        const visibleChildren = isExpanded ? item.children : lastIterChildren;
        const nested = convertTreeToOpenNodes(
          visibleChildren,
          stepExecutionMap,
          selectedId,
          onSelectStepExecution,
          expandedForeachIds,
          onToggleForeach,
          options
        );

        if (!isExpanded && hiddenAttempts.length > 0) {
          const hiddenChildren = item.children.filter(
            (c) => c.attemptNumber !== undefined && hiddenAttempts.includes(c.attemptNumber)
          );
          return [
            buildIterationExpandNode(
              foreachParentId,
              hiddenAttempts,
              hiddenChildren,
              stepExecutionMap,
              onToggleForeach
            ),
            ...nested,
          ];
        }

        return nested;
      }

      return convertTreeToOpenNodes(
        item.children,
        stepExecutionMap,
        selectedId,
        onSelectStepExecution,
        expandedForeachIds,
        onToggleForeach,
        options
      );
    })();

    const showAggregateDanger =
      !isBranchLabel &&
      !(status != null && isDangerousStatus(status)) &&
      subtreeHasDangerousStatus(item, stepExecutionMap);

    const node: OpenTreeNode = {
      id: nodeId,
      defaultExpanded:
        childNodesForParent.length > 0 && !COLLAPSED_BY_DEFAULT_STEP_TYPES.includes(item.stepType),
      children: childNodesForParent,
      row: {
        stepId: displayLabel,
        stepType,
        selected,
        status,
        executionTimeMs: stepExecution?.executionTimeMs ?? null,
        usage: rolledUsage,
        usageCallCount: rolledCallCount,
        onSelect: selectStep,
        isExpandable: childNodesForParent.length > 0,
        isTrigger: isTriggerPseudoStep,
        isBranchLabel,
        isSkeleton: isSkeletonStep,
        attemptNumber: item.attemptNumber,
        showAggregateDanger,
        error: status && isDangerousStatus(status) ? stepExecution?.error ?? null : null,
        onViewFailedStepInput:
          status && isDangerousStatus(status) && stepExecution?.id
            ? () => onSelectStepExecution(stepExecution.id)
            : undefined,
        errorPanelExpanded:
          options?.autoExpandErrorForStepId != null &&
          stepExecution?.id === options.autoExpandErrorForStepId,
      },
    };

    return [node];
  });
}

const OpenTreeNodes = ({
  nodes,
  expandedIds,
  onToggleExpand,
  statusPlacement,
  depth = 0,
}: {
  nodes: OpenTreeNode[];
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  statusPlacement: StatusPlacement;
  depth?: number;
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <>
      {nodes.map((node) => {
        const isExpanded = node.children.length > 0 && expandedIds.has(node.id);

        return (
          <div key={node.id} data-depth={depth}>
            <StepExecutionTreeRow
              {...node.row}
              isExpanded={isExpanded}
              onToggleExpand={
                node.children.length > 0 ? () => onToggleExpand(node.id) : undefined
              }
              isExpandable={node.children.length > 0}
              statusPlacement={statusPlacement}
              data-test-subj={
                node.row.isBranchLabel
                  ? 'workflowStepExecutionTreeBranchRow'
                  : 'step-execution-tree-item-label'
              }
            />
            {isExpanded && node.children.length > 0 && (
              <div
                data-test-subj="workflowStepTreeIndentGuide"
                css={css`
                  margin-left: ${INDENT_GUIDE_MARGIN_PX}px;
                  padding-left: ${INDENT_CHILD_PADDING_PX}px;
                  border-left: 1.5px solid ${euiTheme.colors.borderBaseSubdued};
                `}
              >
                <OpenTreeNodes
                  nodes={node.children}
                  expandedIds={expandedIds}
                  onToggleExpand={onToggleExpand}
                  statusPlacement={statusPlacement}
                  depth={depth + 1}
                />
              </div>
            )}
          </div>
        );
      })}
    </>
  );
};

const collectDefaultExpandedIds = (nodes: OpenTreeNode[], into: Set<string>) => {
  for (const node of nodes) {
    if (node.defaultExpanded && node.children.length > 0) {
      into.add(node.id);
    }
    collectDefaultExpandedIds(node.children, into);
  }
};

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

const flattenIfBranches = (items: StepExecutionTreeItem[]): StepExecutionTreeItem[] =>
  items.flatMap((item) => {
    if (item.stepType === 'if-branch' || item.stepType === 'enter-case-branch') {
      const branchTaken = item.children.some((c) => c.stepExecutionId != null);
      return [
        {
          ...item,
          status: branchTaken ? ExecutionStatus.COMPLETED : ExecutionStatus.SKIPPED,
          children: [],
        },
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

export interface WorkflowStepExecutionTreeProps {
  execution: WorkflowExecutionDto | null;
  definition: WorkflowYaml | null;
  error: Error | null;
  onStepExecutionClick: (stepExecutionId: string) => void;
  selectedId: string | null;
  childExecutionsMap?: ChildWorkflowExecutionsMap;
  isLoadingChildExecutions?: boolean;
  searchQuery?: string;
  /** Auto-expand the inline error panel for this step execution id (failed execution open). */
  autoExpandErrorForStepId?: string | null;
  /** Status icon anchoring. Default inline-left after metadata. */
  statusPlacement?: StatusPlacement;
}

export const WorkflowStepExecutionTree = ({
  error,
  execution,
  definition,
  onStepExecutionClick,
  selectedId,
  childExecutionsMap,
  isLoadingChildExecutions,
  searchQuery,
  autoExpandErrorForStepId,
  statusPlacement = 'inline',
}: WorkflowStepExecutionTreeProps) => {
  const styles = useMemoCss(componentStyles);
  const [expandedForeachIds, setExpandedForeachIds] = useState<Set<string>>(new Set());
  const [userExpandedIds, setUserExpandedIds] = useState<Set<string> | null>(null);

  const onToggleForeach = useCallback((id: string) => {
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

  const openNodes = useMemo(() => {
    if (!execution || !definition || error) return [] as OpenTreeNode[];
    if (
      execution.stepExecutions?.length === 0 &&
      !isInProgressStatus(execution.status) &&
      !failedBeforeSteps
    ) {
      return [] as OpenTreeNode[];
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

    const overviewPseudoStep = stepExecutionsTree.find((item) => item.stepType === '__overview');
    if (overviewPseudoStep) {
      stepExecutionMap.set('__overview', buildOverviewStepExecutionFromContext(execution));
    }

    const triggerTreeItem =
      stepExecutionsTree.find((item) => item.stepType === '__trigger') ??
      stepExecutionsTree.find((item) => item.stepType === '__inputs');
    if (triggerTreeItem && execution.context) {
      const triggerExecution = buildTriggerStepExecutionFromContext(execution);
      if (triggerExecution) {
        stepExecutionMap.set(triggerExecution.id, triggerExecution);
        triggerTreeItem.stepExecutionId = triggerExecution.id;
        triggerTreeItem.stepType = triggerExecution.stepType ?? '';
      }
    }
    const visibleTree = stepExecutionsTree.filter((item) => item.stepType !== '__overview');
    const filteredTree = searchQuery ? filterStepTree(visibleTree, searchQuery) : visibleTree;
    const flatTree = flattenIfBranches(filteredTree);

    return convertTreeToOpenNodes(
      flatTree,
      stepExecutionMap,
      selectedId,
      onStepExecutionClick,
      expandedForeachIds,
      onToggleForeach,
      {
        executionUsage: execution.usage,
        autoExpandErrorForStepId,
      }
    );
  }, [
    autoExpandErrorForStepId,
    childExecutionsMap,
    definition,
    error,
    execution,
    expandedForeachIds,
    failedBeforeSteps,
    isLoadingChildExecutions,
    onStepExecutionClick,
    onToggleForeach,
    searchQuery,
    selectedId,
  ]);

  const defaultExpandedIds = useMemo(() => {
    const ids = new Set<string>();
    collectDefaultExpandedIds(openNodes, ids);
    return ids;
  }, [openNodes]);

  const expandedIds = userExpandedIds ?? defaultExpandedIds;

  const onToggleExpand = useCallback(
    (id: string) => {
      setUserExpandedIds((prev) => {
        const base = prev ?? new Set(defaultExpandedIds);
        const next = new Set(base);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    },
    [defaultExpandedIds]
  );

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
  }

  if (error) {
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
              id="workflows.WorkflowStepExecutionTree.noExecutionFound"
              defaultMessage="No step executions found"
            />
          </h2>
        }
      />
    );
  }

  if (definition) {
    return (
      <div
        css={styles.treeViewContainer}
        role="tree"
        aria-label={i18n.translate(
          'workflows.WorkflowStepExecutionTree.workflowStepExecutionTreeAriaLabel',
          {
            defaultMessage: 'Workflow step execution tree',
          }
        )}
        data-test-subj="workflowStepExecutionTree"
      >
        <OpenTreeNodes
          nodes={openNodes}
          expandedIds={expandedIds}
          onToggleExpand={onToggleExpand}
          statusPlacement={statusPlacement}
        />
      </div>
    );
  }

  return (
    <EuiEmptyPrompt
      {...emptyPromptCommonProps}
      icon={<EuiIcon type="error" size="l" aria-hidden={true} />}
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
    padding-block: ${euiTheme.size.xs};
  `,
};
