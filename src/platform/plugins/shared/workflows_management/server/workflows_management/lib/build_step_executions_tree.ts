/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowStepExecution, WorkflowYaml } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import type { StepListTreeItem } from '@kbn/workflows/graph';
import { convertToWorkflowGraph, getNestedStepsFromGraph } from '@kbn/workflows/graph';

interface StepExecutionTreeItem extends StepListTreeItem {
  status: ExecutionStatus;
  stepExecutionId: string | null;
  children: StepExecutionTreeItem[];
}

export function buildStepExecutionsTree(
  workflowDefinition: WorkflowYaml,
  workflowExecutionStatus: ExecutionStatus,
  stepExecutions: EsWorkflowStepExecution[]
): StepListTreeItem[] {
  const stepExecutionMap = new Map<string, EsWorkflowStepExecution[]>();
  for (const stepExecution of stepExecutions) {
    if (stepExecutionMap.has(stepExecution.stepId)) {
      stepExecutionMap.get(stepExecution.stepId)?.push(stepExecution);
    } else {
      stepExecutionMap.set(stepExecution.stepId, [stepExecution]);
    }
  }
  const stepListTree = transformWorkflowDefinitionToStepListTree(workflowDefinition);
  return enrichStepListTreeWithStepExecutions(
    stepListTree,
    workflowExecutionStatus,
    stepExecutionMap,
    null
  );
}

function transformWorkflowDefinitionToStepListTree(
  workflowDefinition: WorkflowYaml
): StepListTreeItem[] {
  const workflowExecutionGraph = convertToWorkflowGraph(workflowDefinition);
  return getNestedStepsFromGraph(workflowExecutionGraph);
}

function enrichStepListTreeWithStepExecutions(
  treeItems: StepExecutionTreeItem[] | StepListTreeItem[],
  wfExecutionStatus: ExecutionStatus,
  stepExecutionMap: Map<string, EsWorkflowStepExecution[]>,
  parentId: string | null
): StepExecutionTreeItem[] {
  return treeItems
    .map((item) => {
      let stepExecutions = stepExecutionMap.get(item.stepId) ?? [];
      if (parentId) {
        stepExecutions = stepExecutions.filter(
          (stepExecution) => stepExecution.parentId === parentId
        );
      }
      if (!stepExecutions.length) {
        // return [];
        const mockStatus =
          wfExecutionStatus === ExecutionStatus.PENDING ||
          wfExecutionStatus === ExecutionStatus.WAITING ||
          wfExecutionStatus === ExecutionStatus.RUNNING
            ? ExecutionStatus.PENDING
            : ExecutionStatus.SKIPPED;
        return [
          {
            ...item,
            executionIndex: item.executionIndex,
            status: mockStatus,
            stepExecutionId: null,
            children:
              item.children.length > 0
                ? enrichStepListTreeWithStepExecutions(
                    item.children,
                    wfExecutionStatus,
                    stepExecutionMap,
                    null
                  )
                : [],
          },
        ];
      }
      return stepExecutions.map((stepExecution) => ({
        ...item,
        status: stepExecution.status,
        stepExecutionId: stepExecution.id,
        children:
          item.children.length > 0
            ? enrichStepListTreeWithStepExecutions(
                item.children,
                wfExecutionStatus,
                stepExecutionMap,
                stepExecution.id
              )
            : [],
      }));
    })
    .flat()
    .sort((a, b) => a.executionIndex - b.executionIndex);
}
