/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import type { StepExecutionTreeItem } from '../ui/build_step_executions_tree';

const isPseudoTreeStep = (item: StepExecutionTreeItem): boolean =>
  item.stepType === '__overview' ||
  item.stepType === '__trigger' ||
  item.stepType === '__inputs' ||
  Boolean(item.isTriggerPseudoStep);

/**
 * Reorders top-level tree rows to match the workflow definition and inserts
 * ghosted "Not run" leaves for definition steps with no execution record.
 *
 * Unexecuted control-flow steps (foreach, if, …) stay leaves — no fabricated children.
 */
export const mergeDefinitionStepsIntoTree = (
  tree: StepExecutionTreeItem[],
  definition: WorkflowYaml | null | undefined
): StepExecutionTreeItem[] => {
  if (!definition?.steps?.length) {
    return tree;
  }

  const pseudoSteps = tree.filter(isPseudoTreeStep);
  const executedByStepId = new Map<string, StepExecutionTreeItem>();
  for (const item of tree) {
    if (!isPseudoTreeStep(item)) {
      executedByStepId.set(item.stepId, item);
    }
  }

  const aligned: StepExecutionTreeItem[] = definition.steps.map((step, index) => {
    const existing = executedByStepId.get(step.name);
    if (existing) {
      executedByStepId.delete(step.name);
      return existing;
    }
    return {
      stepId: step.name,
      stepType: step.type,
      executionIndex: index,
      stepExecutionId: null,
      status: ExecutionStatus.SKIPPED,
      children: [],
    };
  });

  // Preserve any executed top-level nodes not present in the definition (defensive).
  const leftovers = [...executedByStepId.values()];
  return [...pseudoSteps, ...aligned, ...leftovers];
};
