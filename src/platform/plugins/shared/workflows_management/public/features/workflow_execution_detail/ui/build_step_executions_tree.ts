/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// TODO: Remove the eslint-disable comments to use the proper types.
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

import type { StackFrame, WorkflowStepExecutionDto } from '@kbn/workflows';
import { ExecutionStatus, isExecuteSyncStepType, isTerminalStatus } from '@kbn/workflows';
import type { ChildWorkflowExecutionsMap } from '../model/use_child_workflow_executions';

export interface StepListTreeItem {
  stepId: string;
  stepType: string;
  executionIndex: number;
  children: StepListTreeItem[];
}

export interface StepExecutionTreeItem extends StepListTreeItem {
  status: ExecutionStatus | null;
  stepExecutionId: string | null;
  isTriggerPseudoStep?: boolean;
  isChildWorkflowStep?: boolean;
  /**
   * Human-readable label to render instead of `stepId`. Used to show static
   * parallel branch names (e.g. "virustotal") instead of the raw scope index
   * ("0", "1", ...) the engine uses internally.
   */
  displayLabel?: string;
  children: StepExecutionTreeItem[];
}

function getStepTreeType(
  currentStep: WorkflowStepExecutionDto | undefined,
  previousStepExecution: WorkflowStepExecutionDto | undefined
) {
  if (currentStep?.stepType) {
    return currentStep.stepType;
  }

  if (previousStepExecution) {
    if (previousStepExecution.stepType === 'foreach') {
      return 'foreach-iteration';
    }

    if (previousStepExecution.stepType === 'while') {
      return 'while-iteration';
    }

    if (previousStepExecution.stepType === 'if') {
      return 'if-branch';
    }

    if (previousStepExecution.stepType === 'parallel') {
      return 'parallel-branch';
    }
  }

  return 'unknown';
}

/**
 * Resolves the human-readable name of a parallel branch from the parent parallel
 * step execution. The engine identifies branches by their scope index ("0", "1",
 * ...); for static `branches` mode each branch has a name which is snapshotted as
 * the branch `key` in the parallel step's runtime state (index-aligned). We use
 * that to display the name instead of the bare index.
 *
 * Returns `undefined` when the parent is not a parallel step, the scope segment is
 * not a numeric index, or no matching branch name is found (e.g. dynamic foreach
 * fan-out, where the index is the meaningful label).
 */
function resolveParallelBranchName(
  parentStepExecution: WorkflowStepExecutionDto | undefined,
  scopeSegment: string
): string | undefined {
  if (parentStepExecution?.stepType !== 'parallel') {
    return undefined;
  }

  const index = Number(scopeSegment);
  if (!Number.isInteger(index) || index < 0) {
    return undefined;
  }

  const parallelState = parentStepExecution.state as
    | { branches?: unknown; static?: unknown }
    | undefined;

  // Only static `branches` mode has meaningful author-chosen names as the branch
  // `key`. In dynamic `foreach` fan-out the `key` is the snapshotted item (which
  // may be arbitrary/long data, e.g. an agent prompt), so the fan-out index is
  // the correct label — fall back to it by returning undefined here.
  if (parallelState?.static !== true) {
    return undefined;
  }

  const branches = parallelState.branches;
  if (!Array.isArray(branches)) {
    return undefined;
  }

  const branch = branches[index] as { key?: unknown } | undefined;
  if (branch && typeof branch.key === 'string' && branch.key.length > 0) {
    return branch.key;
  }

  return undefined;
}

function isVisibleStepType(stepType: string): boolean {
  return !['workflow_level_timeout'].includes(stepType);
}

/**
 * Builds a deterministic step path from a stack of execution entries.
 *
 * This function is crucial for handling scoped operations like foreach, if, retry,
 * continue, fallback, and other nested workflow constructs. It generates a consistent
 * path representation that can be used to track execution flow and state across
 * complex workflow hierarchies.
 *
 * The function processes the execution stack to create a flattened path array,
 * ensuring deterministic results for the same input regardless of execution context.
 * It handles deduplication of consecutive step IDs and properly incorporates
 * sub-scope identifiers when present.
 *
 * @param stepId - The current step identifier being processed
 * @param stackFrames - Array of stack frames representing the execution hierarchy
 * @returns A string array representing the deterministic step path
 */
export function flattenStackFrames(stackFrames: StackFrame[]): string[] {
  return stackFrames.flatMap((stackFrame) => {
    const scopeWithSubScope = stackFrame.nestedScopes
      .filter((scopeEntry) => scopeEntry.scopeId)
      .map((scopeEntry) => scopeEntry.scopeId!);

    if (!scopeWithSubScope.length) {
      return [];
    }

    return [stackFrame.stepId, ...scopeWithSubScope];
  });
}

/**
 * A parallel branch is a *scope* that can hold multiple steps, so it is rendered
 * as an expandable grouping node (e.g. "virustotal" → scan_hash, console). When a
 * branch contains exactly one step, that extra level is pure noise, so we collapse
 * the branch node into its single child and surface the branch name on the step's
 * own row. Branches with 2+ steps keep the grouping node so the per-branch timing
 * and status stay visible.
 */
function collapseSingleStepParallelBranches(
  items: StepExecutionTreeItem[]
): StepExecutionTreeItem[] {
  return items.map((item) => {
    const children = collapseSingleStepParallelBranches(item.children);

    // Only collapse *named* branches (static `branches` mode). Dynamic foreach
    // fan-out branches have no name and the index is their meaningful identity, so
    // they stay grouped under the index node.
    const isCollapsibleBranch =
      item.stepType === 'parallel-branch' &&
      item.displayLabel !== undefined &&
      children.length === 1;
    if (isCollapsibleBranch) {
      const [onlyChild] = children;
      return {
        ...onlyChild,
        // Keep the branch name as the visible label; the row otherwise *is* the
        // underlying step (its execution id, status, type, input/output).
        displayLabel: item.displayLabel,
      };
    }

    return { ...item, children };
  });
}

export function buildStepExecutionsTree(
  stepExecutions: WorkflowStepExecutionDto[],
  executionContext?: Record<string, any>,
  executionStatus?: ExecutionStatus,
  triggeredBy?: string
): StepExecutionTreeItem[] {
  const root = {};
  const stepExecutionsMap: Map<string, WorkflowStepExecutionDto> = new Map();
  const computedPathsMap: Map<string, string[]> = new Map();

  stepExecutions
    .filter((stepExecution) => isVisibleStepType(stepExecution.stepType!))
    .forEach((stepExecution) => {
      const computedPath = [
        ...(stepExecution.scopeStack ? flattenStackFrames(stepExecution.scopeStack) : []),
        stepExecution.stepId,
      ];
      const key = computedPath.join('>');
      computedPathsMap.set(stepExecution.id, computedPath);
      stepExecutionsMap.set(key, {
        ...stepExecution,
      });
    });

  Array.from(stepExecutionsMap.values()).forEach(({ id }) => {
    const computedPath = computedPathsMap.get(id!)!;

    let current: any = root;
    const fullPath: string[] = [];

    for (const currentPart of computedPath) {
      fullPath.push(currentPart);

      if (!current[currentPart as keyof typeof current]) {
        const currentFullKey = fullPath.join('>');
        const parentStepExecution = stepExecutionsMap.get(
          fullPath.slice(0, fullPath.length - 1).join('>')
        );
        const branchName = resolveParallelBranchName(parentStepExecution, currentPart);
        let result: StepExecutionTreeItem;
        if (stepExecutionsMap.has(currentFullKey)) {
          const stepExecution = stepExecutionsMap.get(currentFullKey)!;
          result = {
            stepId: currentPart,
            stepType: stepExecution.stepType!,
            executionIndex: stepExecution.stepExecutionIndex!,
            stepExecutionId: stepExecution.id!,
            status: stepExecution.status!,
            children: [],
            ...(branchName ? { displayLabel: branchName } : {}),
          };
        } else {
          result = {
            stepId: currentPart,
            stepType: getStepTreeType(
              stepExecutionsMap.get(currentFullKey),
              parentStepExecution
            ) as any,
            executionIndex: 0,
            stepExecutionId: undefined as any,
            status: ExecutionStatus.SKIPPED,
            children: [],
            ...(branchName ? { displayLabel: branchName } : {}),
          };
        }

        current[currentPart as string] = result;
      }
      current = (current[currentPart as keyof typeof current] as any).children;
    }
  });

  function toArray(node: any): any {
    return Object.values(node).map((n: any) => ({
      ...n,
      children: toArray(n.children),
    }));
  }

  const regularSteps = collapseSingleStepParallelBranches(toArray(root));
  // Pseudo-steps are not real steps, an example is the trigger pseudo-step that is used to display the trigger context
  const pseudoSteps: StepExecutionTreeItem[] = [];

  if (executionStatus !== undefined) {
    pseudoSteps.push({
      stepId: 'Overview',
      stepType: '__overview',
      executionIndex: 0,
      stepExecutionId: '__overview',
      status: executionStatus,
      children: [],
    });
  }

  if (executionContext) {
    const hasEvent = executionContext.event && Object.keys(executionContext.event).length > 0;
    const hasInputs = executionContext.inputs !== undefined;

    if (hasEvent) {
      pseudoSteps.push({
        stepId: 'Event',
        stepType: '__trigger',
        executionIndex: 0,
        stepExecutionId: '__pseudo_trigger__',
        status: ExecutionStatus.COMPLETED,
        isTriggerPseudoStep: true,
        children: [],
      });
    }

    // in scheduled workflows, inputs are available but are presented in the trigger itself.
    // This is to avoid showing the inputs pseudo-step when the event is present
    // as the inputs are already displayed in the event pseudo-step
    if (hasInputs && !hasEvent) {
      pseudoSteps.push({
        stepId: 'Inputs',
        stepType: '__inputs',
        executionIndex: 0,
        stepExecutionId: '__pseudo_inputs__',
        status: ExecutionStatus.COMPLETED,
        isTriggerPseudoStep: true,
        children: [],
      });
    }
  }

  // When execution failed/skipped before any steps ran and no trigger pseudo-step
  // was created from context, create one from triggeredBy so the invocation type is visible
  const hasTriggerPseudo = pseudoSteps.some(
    (s) => s.stepType === '__trigger' || s.stepType === '__inputs'
  );
  if (!hasTriggerPseudo && triggeredBy) {
    pseudoSteps.push({
      stepId: triggeredBy === 'manual' ? 'Inputs' : 'Event',
      stepType: triggeredBy === 'manual' ? '__inputs' : '__trigger',
      executionIndex: 0,
      stepExecutionId: triggeredBy === 'manual' ? '__pseudo_inputs__' : '__pseudo_trigger__',
      status: executionStatus ?? ExecutionStatus.COMPLETED,
      isTriggerPseudoStep: true,
      children: [],
    });
  }

  return [...pseudoSteps, ...regularSteps];
}

/**
 * Injects child workflow execution steps into the tree as children of `workflow.execute` nodes.
 * For steps where child data is still loading, adds a loading placeholder to show the expand arrow.
 */
export function injectChildWorkflowSteps(
  tree: StepExecutionTreeItem[],
  childExecutionsMap: ChildWorkflowExecutionsMap,
  isLoadingChildData: boolean
): { tree: StepExecutionTreeItem[]; childStepExecutions: WorkflowStepExecutionDto[] } {
  const childStepExecutions: WorkflowStepExecutionDto[] = [];

  function processNode(node: StepExecutionTreeItem): StepExecutionTreeItem {
    const isWorkflowExecuteStep = isExecuteSyncStepType(node.stepType) && node.stepExecutionId;

    if (!isWorkflowExecuteStep) {
      return {
        ...node,
        children: node.children.map(processNode),
      };
    }

    if (childExecutionsMap.has(node.stepExecutionId!)) {
      const childExecution = childExecutionsMap.get(node.stepExecutionId!)!;
      const visibleSteps = childExecution.stepExecutions.filter((step) =>
        isVisibleStepType(step.stepType ?? '')
      );
      childStepExecutions.push(...visibleSteps);
      const childItems: StepExecutionTreeItem[] = visibleSteps.map((step) => ({
        stepId: step.stepId,
        stepType: step.stepType ?? 'unknown',
        executionIndex: step.stepExecutionIndex,
        stepExecutionId: step.id,
        status: step.status,
        isChildWorkflowStep: true,
        children: [],
      }));

      return {
        ...node,
        children: [...childItems, ...node.children.map(processNode)],
      };
    }

    if (isLoadingChildData && node.status && isTerminalStatus(node.status)) {
      return {
        ...node,
        children: [
          {
            stepId: 'Loading...',
            stepType: '__loading',
            executionIndex: 0,
            stepExecutionId: `__loading_${node.stepExecutionId}`,
            status: ExecutionStatus.RUNNING,
            isChildWorkflowStep: true,
            children: [],
          },
          ...node.children.map(processNode),
        ],
      };
    }

    return {
      ...node,
      children: node.children.map(processNode),
    };
  }

  const processedTree = tree.map(processNode);
  return { tree: processedTree, childStepExecutions };
}
