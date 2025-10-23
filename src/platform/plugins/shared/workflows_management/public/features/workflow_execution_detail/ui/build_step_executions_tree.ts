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
import { ExecutionStatus } from '@kbn/workflows';

export interface StepListTreeItem {
  stepId: string;
  stepType: string;
  executionIndex: number;
  children: StepListTreeItem[];
}

export interface StepExecutionTreeItem extends StepListTreeItem {
  status: ExecutionStatus | null;
  stepExecutionId: string | null;
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

    if (previousStepExecution.stepType === 'if') {
      return 'if-branch';
    }
  }

  return 'unknown';
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

export function buildStepExecutionsTree(
  stepExecutions: WorkflowStepExecutionDto[]
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

  for (const { id } of stepExecutionsMap.values()) {
    const computedPath = computedPathsMap.get(id!)!;

    let current: any = root;
    const fullPath: string[] = [];

    for (const currentPart of computedPath) {
      fullPath.push(currentPart);

      if (!current[currentPart as keyof typeof current]) {
        const currentFullKey = fullPath.join('>');
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
          };
        } else {
          result = {
            stepId: currentPart,
            stepType: getStepTreeType(
              stepExecutionsMap.get(currentFullKey),
              stepExecutionsMap.get(fullPath.slice(0, fullPath.length - 1).join('>'))
            ) as any,
            executionIndex: 0,
            stepExecutionId: undefined as any,
            status: ExecutionStatus.SKIPPED,
            children: [],
          };
        }

        current[currentPart as string] = result;
      }
      current = (current[currentPart as keyof typeof current] as any).children;
    }
  }

  function toArray(node: any): any {
    return Object.values(node).map((n: any) => ({
      ...n,
      children: toArray(n.children),
    }));
  }

  return toArray(root);
}
