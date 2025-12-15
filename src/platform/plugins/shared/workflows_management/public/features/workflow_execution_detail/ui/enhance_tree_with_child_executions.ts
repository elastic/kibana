/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowExecutionDto, WorkflowStepExecutionDto } from '@kbn/workflows';
import type { StepExecutionTreeItem } from './build_step_executions_tree';
import { buildStepExecutionsTree } from './build_step_executions_tree';

/**
 * Extract child execution ID from workflow.execute step execution state
 */
function extractChildExecutionId(stepExecution: WorkflowStepExecutionDto): string | null {
  if (
    stepExecution.stepType !== 'workflow.execute' &&
    stepExecution.stepType !== 'workflow.executeAsync'
  ) {
    return null;
  }

  const state = stepExecution.state as
    | { executionId?: string; workflowId?: string; startedAt?: string }
    | undefined;

  return state?.executionId ?? null;
}

/**
 * Enhance tree items with child workflow execution steps
 * For workflow.execute and workflow.executeAsync steps, if they have a child execution,
 * add the child execution's steps as nested children
 *
 * @param treeItems - Tree items to enhance
 * @param stepExecutionMap - Map of step execution IDs to step execution objects (may contain prefixed IDs for nested children)
 * @param childExecutionsMap - Map of child execution IDs to child execution objects
 * @param parentPrefix - Optional prefix for nested children (e.g., "child::parentId::" for sub-children)
 * @param fullStepExecutionMap - Optional full map containing all step executions at all levels (for nested lookups)
 */
export function enhanceTreeWithChildExecutions(
  treeItems: StepExecutionTreeItem[],
  stepExecutionMap: Map<string, WorkflowStepExecutionDto>,
  childExecutionsMap: Map<string, WorkflowExecutionDto>,
  parentPrefix: string = '',
  fullStepExecutionMap?: Map<string, WorkflowStepExecutionDto>
): StepExecutionTreeItem[] {
  // Use fullStepExecutionMap if provided (for nested lookups), otherwise use stepExecutionMap
  const lookupMap = fullStepExecutionMap || stepExecutionMap;

  return treeItems.map((item) => {
    const stepExecution = item.stepExecutionId ? lookupMap.get(item.stepExecutionId) : null;

    if (!stepExecution) {
      return {
        ...item,
        children: enhanceTreeWithChildExecutions(
          item.children,
          stepExecutionMap,
          childExecutionsMap,
          parentPrefix,
          fullStepExecutionMap
        ),
      };
    }

    const childExecutionId = extractChildExecutionId(stepExecution);
    const childExecution = childExecutionId ? childExecutionsMap.get(childExecutionId) : null;

    if (childExecution && childExecution.stepExecutions) {
      // Build tree for child execution
      const childTreeItems = buildStepExecutionsTree(
        childExecution.stepExecutions,
        childExecution.context,
        childExecution.status
      );

      // Build prefix for nested children: preserve parent prefix and add current child prefix
      // For first level: "child::${childExecutionId}::"
      // For nested: "child::parentId::child::${childExecutionId}::"
      const currentPrefix = parentPrefix
        ? `${parentPrefix}child::${childExecution.id}::`
        : `child::${childExecution.id}::`;

      // Create a map for child step executions with prefixed IDs to match enhancedStepExecutionMap
      // This map needs to include both regular steps and pseudo-steps for proper lookup
      const childStepExecutionMap = new Map<string, WorkflowStepExecutionDto>();
      for (const childStepExecution of childExecution.stepExecutions) {
        // Format: ${currentPrefix}${stepExecutionId}
        const prefixedId = `${currentPrefix}${childStepExecution.id}`;
        childStepExecutionMap.set(prefixedId, childStepExecution);
      }

      // Merge with parent stepExecutionMap so nested children can be found
      // Use fullStepExecutionMap if available (contains all nested children), otherwise merge locally
      const mergedStepExecutionMap = fullStepExecutionMap
        ? new Map(fullStepExecutionMap)
        : new Map(stepExecutionMap);
      for (const [key, value] of childStepExecutionMap.entries()) {
        mergedStepExecutionMap.set(key, value);
      }

      // Update child tree items to use prefixed IDs
      const childTreeItemsWithPrefixedIds = childTreeItems.map((childItem) => {
        if (childItem.stepExecutionId) {
          // Format: ${currentPrefix}${stepExecutionId}
          const prefixedId = `${currentPrefix}${childItem.stepExecutionId}`;
          return {
            ...childItem,
            stepExecutionId: prefixedId,
          };
        }
        return childItem;
      });

      // Recursively enhance child tree items (in case child has its own child executions)
      // Pass the merged map and current prefix so nested children preserve the full chain
      // and can find all step executions (including nested ones)
      // Also pass fullStepExecutionMap so nested children can look up all levels
      const enhancedChildTreeItems = enhanceTreeWithChildExecutions(
        childTreeItemsWithPrefixedIds,
        mergedStepExecutionMap,
        childExecutionsMap,
        currentPrefix,
        fullStepExecutionMap || mergedStepExecutionMap
      );

      return {
        ...item,
        children: [
          ...enhanceTreeWithChildExecutions(
            item.children,
            stepExecutionMap,
            childExecutionsMap,
            parentPrefix,
            fullStepExecutionMap
          ),
          ...enhancedChildTreeItems,
        ],
      };
    }

    return {
      ...item,
      children: enhanceTreeWithChildExecutions(
        item.children,
        stepExecutionMap,
        childExecutionsMap,
        parentPrefix,
        fullStepExecutionMap
      ),
    };
  });
}
