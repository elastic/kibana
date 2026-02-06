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
  EuiHorizontalRule,
  EuiIcon,
  EuiLoadingSpinner,
  EuiText,
  EuiTreeView,
  logicalCSS,
  transparentize,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useMemo } from 'react';

import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type {
  ExecutionStatus,
  WorkflowExecutionDto,
  WorkflowStepExecutionDto,
  WorkflowYaml,
} from '@kbn/workflows';
import { isDangerousStatus, isInProgressStatus, isTerminalStatus } from '@kbn/workflows';
import type { StepExecutionTreeItem } from './build_step_executions_tree';
import { buildStepExecutionsTree } from './build_step_executions_tree';
import { enhanceTreeWithChildExecutions } from './enhance_tree_with_child_executions';
import { StepExecutionTreeItemLabel } from './step_execution_tree_item_label';
import {
  buildOverviewStepExecutionFromContext,
  buildTriggerStepExecutionFromContext,
} from './workflow_pseudo_step_context';
import { StepIcon } from '../../../shared/ui/step_icons/step_icon';
import { useChildWorkflowExecutions } from '../model/use_child_workflow_execution';

const TRIGGER_BOLT_ICON_SVG =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><path fill="%23535966" d="M7.04 13.274a.5.5 0 1 0 .892.453l3.014-5.931a.5.5 0 0 0-.445-.727H5.316L8.03 1.727a.5.5 0 1 0-.892-.453L4.055 7.343a.5.5 0 0 0 .446.726h5.185L7.04 13.274Z"/></svg>';

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
    // For child steps with prefixed IDs, check if the selected ID matches the prefixed ID
    const selected = selectedId === stepExecution?.id || selectedId === item.stepExecutionId;

    const stepId = stepExecution?.stepId ?? item.stepId;
    const stepType = stepExecution?.stepType ?? item.stepType;

    const selectStepExecution: React.MouseEventHandler = (e) => {
      // Prevent the click event from bubbling up to the tree view item so that the tree view item is not expanded/collapsed when selected
      e.preventDefault();
      e.stopPropagation();
      // Use item.stepExecutionId first (which is the prefixed ID for child steps)
      // This ensures child steps use the prefixed format: child::${childExecutionId}::${stepExecutionId}
      if (item.stepExecutionId) {
        onSelectStepExecution(item.stepExecutionId);
      } else if (stepExecution?.id) {
        // Fallback to stepExecution.id for parent steps
        onSelectStepExecution(stepExecution.id);
      }
    };

    // Check if this is a trigger pseudo-step
    const isTriggerPseudoStep = stepType.startsWith('trigger_');

    return {
      id: item.stepExecutionId ?? `${item.stepId}-${item.executionIndex}-no-step-execution`,
      css: [
        getStatusCss({ status, selected }, euiTheme),
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

  // Recursively extract all child execution IDs at all nesting levels
  // This must be called unconditionally (before any early returns)
  const childExecutionIds = useMemo(() => {
    if (!execution?.stepExecutions) {
      return [];
    }

    const allChildExecutionIds = new Set<string>();
    const processedExecutionIds = new Set<string>();

    // Helper function to recursively extract child execution IDs
    const extractChildExecutionIdsRecursive = (
      stepExecutions: WorkflowStepExecutionDto[]
    ): void => {
      for (const stepExecution of stepExecutions) {
        if (
          (stepExecution.stepType === 'workflow.execute' ||
            stepExecution.stepType === 'workflow.executeAsync') &&
          stepExecution.state
        ) {
          const state = stepExecution.state as { executionId?: string } | undefined;
          if (state?.executionId && !processedExecutionIds.has(state.executionId)) {
            allChildExecutionIds.add(state.executionId);
            processedExecutionIds.add(state.executionId);
            // Note: We can't recursively fetch here because we need to fetch all executions first
            // The recursive enhancement will handle the nesting when we have all executions loaded
          }
        }
      }
    };

    // Extract from parent execution
    extractChildExecutionIdsRecursive(execution.stepExecutions);

    return Array.from(allChildExecutionIds);
  }, [execution?.stepExecutions]);

  // Fetch first-level child executions - must be called unconditionally
  const { data: firstLevelChildExecutionsMap = new Map() } =
    useChildWorkflowExecutions(childExecutionIds);

  // Recursively discover nested child execution IDs from loaded first-level executions
  // This extracts IDs from child -> sub-child -> sub-sub-child, etc.
  const allNestedChildExecutionIds = useMemo(() => {
    const allIds = new Set<string>(childExecutionIds);
    const processedIds = new Set<string>(childExecutionIds);
    const executionsToProcess = new Map(firstLevelChildExecutionsMap);

    // Recursively extract child execution IDs from all loaded executions
    const extractNestedIds = (executionIds: string[]): void => {
      const newIds: string[] = [];
      for (const execId of executionIds) {
        if (!processedIds.has(execId)) {
          processedIds.add(execId);
          const childExecution = executionsToProcess.get(execId);
          if (childExecution?.stepExecutions) {
            for (const stepExecution of childExecution.stepExecutions) {
              if (
                (stepExecution.stepType === 'workflow.execute' ||
                  stepExecution.stepType === 'workflow.executeAsync') &&
                stepExecution.state
              ) {
                const state = stepExecution.state as { executionId?: string } | undefined;
                if (state?.executionId && !allIds.has(state.executionId)) {
                  allIds.add(state.executionId);
                  newIds.push(state.executionId);
                }
              }
            }
          }
        }
      }
      // Recursively process newly discovered IDs
      if (newIds.length > 0) {
        extractNestedIds(newIds);
      }
    };

    // Start extraction from first-level child executions
    extractNestedIds(Array.from(childExecutionIds));

    return Array.from(allIds);
  }, [childExecutionIds, firstLevelChildExecutionsMap]);

  // Fetch all nested child executions (sub-children, sub-sub-children, etc.)
  const nestedChildExecutionIds = allNestedChildExecutionIds.filter(
    (id) => !childExecutionIds.includes(id)
  );
  const { data: nestedChildExecutionsMap = new Map() } =
    useChildWorkflowExecutions(nestedChildExecutionIds);

  // Continue discovering nested children from the newly fetched nested executions
  // This handles sub-sub-children, sub-sub-sub-children, etc.
  // We need to continue the discovery process after fetching nested executions
  const allDeeplyNestedChildExecutionIds = useMemo(() => {
    const allIds = new Set<string>(allNestedChildExecutionIds);
    const processedIds = new Set<string>(allNestedChildExecutionIds);
    // Merge first-level and nested executions for discovery
    const executionsToProcess = new Map(firstLevelChildExecutionsMap);
    for (const [id, exec] of nestedChildExecutionsMap.entries()) {
      executionsToProcess.set(id, exec);
    }

    // Recursively extract child execution IDs from all loaded executions
    const extractNestedIds = (executionIds: string[]): void => {
      const newIds: string[] = [];
      for (const execId of executionIds) {
        if (!processedIds.has(execId)) {
          processedIds.add(execId);
          const childExecution = executionsToProcess.get(execId);
          if (childExecution?.stepExecutions) {
            for (const stepExecution of childExecution.stepExecutions) {
              if (
                (stepExecution.stepType === 'workflow.execute' ||
                  stepExecution.stepType === 'workflow.executeAsync') &&
                stepExecution.state
              ) {
                const state = stepExecution.state as { executionId?: string } | undefined;
                if (state?.executionId && !allIds.has(state.executionId)) {
                  allIds.add(state.executionId);
                  newIds.push(state.executionId);
                }
              }
            }
          }
        }
      }
      // Recursively process newly discovered IDs
      if (newIds.length > 0) {
        extractNestedIds(newIds);
      }
    };

    // Start extraction from all known child executions (first-level + nested)
    extractNestedIds(Array.from(allNestedChildExecutionIds));

    return Array.from(allIds);
  }, [allNestedChildExecutionIds, firstLevelChildExecutionsMap, nestedChildExecutionsMap]);

  // Fetch deeply nested child executions (sub-sub-children, etc.)
  const deeplyNestedChildExecutionIds = allDeeplyNestedChildExecutionIds.filter(
    (id) => !allNestedChildExecutionIds.includes(id)
  );
  const { data: deeplyNestedChildExecutionsMap = new Map() } = useChildWorkflowExecutions(
    deeplyNestedChildExecutionIds
  );

  // Merge all child executions (all levels) into a single map
  const allChildExecutionsMap = useMemo(() => {
    const merged = new Map(firstLevelChildExecutionsMap);
    for (const [id, childExec] of nestedChildExecutionsMap.entries()) {
      merged.set(id, childExec);
    }
    for (const [id, childExec] of deeplyNestedChildExecutionsMap.entries()) {
      merged.set(id, childExec);
    }
    return merged;
  }, [firstLevelChildExecutionsMap, nestedChildExecutionsMap, deeplyNestedChildExecutionsMap]);

  // Build step execution map with skeletons - must be called unconditionally
  const stepExecutionMap = useMemo(() => {
    if (!execution?.stepExecutions) {
      return new Map<string, WorkflowStepExecutionDto>();
    }
    const map = new Map<string, WorkflowStepExecutionDto>();
    const stepExecutionNameMap = new Map<string, WorkflowStepExecutionDto>();

    for (const stepExecution of execution.stepExecutions) {
      stepExecutionNameMap.set(stepExecution.stepId, stepExecution);
      map.set(stepExecution.id, stepExecution);
    }

    // Add skeleton steps if needed (only when execution is not terminal and definition exists)
    if (definition && !isTerminalStatus(execution.status)) {
      definition.steps
        .filter((step) => !stepExecutionNameMap.has(step.name))
        .filter((step) => !execution.stepId || step.name === execution.stepId)
        .map((step, index) => ({
          stepId: step.name,
          stepType: step.type,
          status: 'pending' as WorkflowStepExecutionDto['status'],
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
          map.set(skeletonStepExecution.id, skeletonStepExecution)
        );
    }

    return map;
  }, [execution?.stepExecutions, execution?.status, execution?.stepId, definition]);

  // Merge child execution step executions into the main stepExecutionMap
  // This ensures child steps can be rendered properly - must be called unconditionally
  // Recursively handles nested children (child -> sub-child -> sub-sub-child, etc.)
  const enhancedStepExecutionMap = useMemo(() => {
    const map = new Map(stepExecutionMap);
    const processedExecutionIds = new Set<string>();

    // Recursively add child execution steps with correct prefixed IDs
    const addChildExecutionSteps = (
      childExecution: WorkflowExecutionDto,
      prefix: string = ''
    ): void => {
      if (processedExecutionIds.has(childExecution.id)) {
        return; // Avoid infinite loops
      }
      processedExecutionIds.add(childExecution.id);

      const currentPrefix = prefix || `child::${childExecution.id}::`;

      // Add step executions
      if (childExecution.stepExecutions) {
        for (const childStepExecution of childExecution.stepExecutions) {
          const prefixedId = `${currentPrefix}${childStepExecution.id}`;
          map.set(prefixedId, childStepExecution);

          // Check if this step is a workflow.execute that has its own child execution
          if (
            (childStepExecution.stepType === 'workflow.execute' ||
              childStepExecution.stepType === 'workflow.executeAsync') &&
            childStepExecution.state
          ) {
            const state = childStepExecution.state as { executionId?: string } | undefined;
            if (state?.executionId) {
              const nestedChildExecution = allChildExecutionsMap.get(state.executionId);
              if (nestedChildExecution) {
                // Recursively add nested child execution steps
                // Prefix format: ${currentPrefix}child::${nestedChildExecution.id}::
                const nestedPrefix = `${currentPrefix}child::${nestedChildExecution.id}::`;
                addChildExecutionSteps(nestedChildExecution, nestedPrefix);
              }
            }
          }
        }
      }

      // Add pseudo-steps for child executions (Overview, Inputs, Trigger)
      const childOverviewPrefixedId = `${currentPrefix}__overview`;
      const childOverview = buildOverviewStepExecutionFromContext(childExecution);
      map.set(childOverviewPrefixedId, childOverview);

      const childTrigger = buildTriggerStepExecutionFromContext(childExecution);
      if (childTrigger) {
        const childInputsPrefixedId = `${currentPrefix}__pseudo_inputs__`;
        const childTriggerPrefixedId = `${currentPrefix}__pseudo_trigger__`;
        map.set(childInputsPrefixedId, childTrigger);
        map.set(childTriggerPrefixedId, childTrigger);
      }
    };

    // Add only first-level child executions (nested children will be added by recursion)
    for (const childExecution of firstLevelChildExecutionsMap.values()) {
      // Only process if not already processed (to avoid duplicates)
      if (!processedExecutionIds.has(childExecution.id)) {
        addChildExecutionSteps(childExecution);
      }
    }

    return map;
  }, [stepExecutionMap, firstLevelChildExecutionsMap, allChildExecutionsMap]);

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
    const stepExecutionsTree = buildStepExecutionsTree(
      Array.from(stepExecutionMap.values()),
      execution.context,
      execution.status
    );

    // Enhance tree with child executions
    // Use enhancedStepExecutionMap which includes both parent and child step executions
    // Use allChildExecutionsMap which includes all nested levels
    // Pass enhancedStepExecutionMap as fullStepExecutionMap so nested children can be found
    const enhancedTree = enhanceTreeWithChildExecutions(
      stepExecutionsTree,
      enhancedStepExecutionMap,
      allChildExecutionsMap,
      '',
      enhancedStepExecutionMap
    );

    const overviewPseudoStep = enhancedTree.find((item) => item.stepType === '__overview');
    if (overviewPseudoStep) {
      const executionOverview = buildOverviewStepExecutionFromContext(execution);
      stepExecutionMap.set('__overview', executionOverview);
      enhancedStepExecutionMap.set('__overview', executionOverview);
    }

    const triggerPseudoStep =
      enhancedTree.find((item) => item.stepType === '__trigger') ??
      enhancedTree.find((item) => item.stepType === '__inputs');

    if (triggerPseudoStep && execution.context) {
      const triggerExecution = buildTriggerStepExecutionFromContext(execution);
      if (triggerExecution) {
        // Remove the old pseudo-step entries to avoid duplicates
        const oldStepExecutionId = triggerPseudoStep.stepExecutionId;
        if (oldStepExecutionId) {
          stepExecutionMap.delete(oldStepExecutionId);
          enhancedStepExecutionMap.delete(oldStepExecutionId);
        }

        stepExecutionMap.set(triggerExecution.id, triggerExecution);
        enhancedStepExecutionMap.set(triggerExecution.id, triggerExecution);
        triggerPseudoStep.stepExecutionId = triggerExecution.id;
        triggerPseudoStep.stepType = triggerExecution.stepType ?? '';
      }
    }
    const items: EuiTreeViewProps['items'] = convertTreeToEuiTreeViewItems(
      enhancedTree,
      enhancedStepExecutionMap,
      euiTheme,
      selectedId,
      onStepExecutionClick
    );

    const overviewItem = items.find(
      (item) => enhancedStepExecutionMap.get(item.id)?.stepType === '__overview'
    );

    // Filter out duplicate trigger pseudo-steps - keep only one trigger-type item
    const seenTriggerStep = new Set<string>();
    const regularItems = items.filter((item) => {
      const stepType = enhancedStepExecutionMap.get(item.id)?.stepType;
      if (stepType === '__overview') {
        return false;
      }
      // If this is a trigger pseudo-step, ensure we only include one
      if (stepType?.startsWith('trigger_')) {
        if (seenTriggerStep.has('trigger')) {
          return false; // Skip duplicate trigger
        }
        seenTriggerStep.add('trigger');
      }
      return true;
    });

    return (
      <>
        <div css={styles.treeViewContainer}>
          {overviewItem && (
            <>
              <EuiTreeView
                showExpansionArrows
                expandByDefault
                items={[overviewItem]}
                aria-label={i18n.translate(
                  'workflows.WorkflowStepExecutionTree.overviewAriaLabel',
                  {
                    defaultMessage: 'Execution overview',
                  }
                )}
              />
              <EuiHorizontalRule
                margin="none"
                css={{ marginTop: euiTheme.size.xs, marginBottom: euiTheme.size.xs }}
              />
            </>
          )}

          {/* Regular steps */}
          {regularItems.length > 0 && (
            <EuiTreeView
              showExpansionArrows
              expandByDefault
              items={regularItems}
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
