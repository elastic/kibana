/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowStepExecutionDto } from '@kbn/workflows';
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

export function buildStepExecutionsTree(
  stepExecutions: WorkflowStepExecutionDto[]
): StepExecutionTreeItem[] {
  const root = {};
  const stepExecutionsMap: Map<string, WorkflowStepExecutionDto> = new Map();
  stepExecutions.forEach((stepExecution) => {
    const computedPath = [...stepExecution.path, stepExecution.stepId];
    const key = computedPath.join('>');
    stepExecutionsMap.set(key, {
      ...stepExecution,
      path: computedPath,
    });
  });

  for (const { path: pathParts } of stepExecutionsMap.values()) {
    let current: any = root;
    const fullPath: string[] = [];

    for (const currentPart of pathParts) {
      fullPath.push(currentPart);

      if (!current[currentPart as keyof typeof current]) {
        const currentFullKey = fullPath.join('>');
        let result: StepExecutionTreeItem;
        if (stepExecutionsMap.has(currentFullKey)) {
          const stepExecution = stepExecutionsMap.get(currentFullKey)!;
          result = {
            stepId: currentPart,
            stepType: stepExecution.stepType!,
            executionIndex: stepExecution.executionIndex!,
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
