/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowStepExecutionDto, WorkflowYaml } from '@kbn/workflows';
import type { ExecutionStatus } from '@kbn/workflows';
import type { StepExecutionTreeItem } from '@kbn/workflows';
import { convertToWorkflowGraph } from '@kbn/workflows/graph';

export function buildStepExecutionsTree(
  workflowDefinition: WorkflowYaml,
  workflowExecutionStatus: ExecutionStatus,
  stepExecutions: WorkflowStepExecutionDto[]
): StepExecutionTreeItem[] {
  const stepMap = new Map<string, StepExecutionTreeItem>();
  const roots: StepExecutionTreeItem[] = [];
  const workflowExecutionGraph = convertToWorkflowGraph(workflowDefinition);
  const sortedStepExecutions = stepExecutions.sort((a, b) => a.executionIndex - b.executionIndex);

  // add all steps to the map
  for (const stepExecution of sortedStepExecutions) {
    const lastPart = stepExecution.path[stepExecution.path.length - 1];
    if (lastPart === 'true' || lastPart === 'false' || !isNaN(parseInt(lastPart, 10))) {
      stepMap.set(stepExecution.path.join('.'), {
        stepId: stepExecution.path.slice(-2).join(':'),
        stepType: lastPart,
        executionIndex: stepExecution.executionIndex,
        stepExecutionId: null,
        status: null,
        children: [],
      });
    }
    const path = [...stepExecution.path, stepExecution.stepId].join('.');
    stepMap.set(path, {
      stepId: stepExecution.stepId,
      stepType: workflowExecutionGraph.node(stepExecution.stepId)?.configuration?.type,
      executionIndex: stepExecution.executionIndex,
      stepExecutionId: stepExecution.id,
      status: stepExecution.status,
      children: [],
    });
  }

  for (const [path, item] of stepMap.entries()) {
    if (path.split('.').length === 1) {
      roots.push(item);
    } else {
      const parentPath = path.split('.').slice(0, -1).join('.');
      const parent = stepMap.get(parentPath);
      if (parent) {
        parent.children.push(item);
      } else {
        throw new Error(`No parent found for ${path}`);
      }
    }
  }

  // TODO: add skipped steps from workflowExecutionGraph

  return roots;
}
