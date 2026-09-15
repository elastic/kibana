/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JsonValue } from '@kbn/utility-types';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';

/**
 * Derives the output of a finished execution from its step executions, for
 * callers that consumed that execution as a unit (`workflow.execute`, a
 * parallel branch) and need a single value rather than a step list.
 *
 * At the outermost scope depth the last step wins; where that step has nested
 * steps, the nesting is followed down and the deepest level's outputs are
 * returned instead.
 */
export const deriveExecutionOutput = (stepExecutions: WorkflowStepExecutionDto[]): JsonValue => {
  if (stepExecutions.length === 0) {
    return null;
  }

  let minDepth = stepExecutions[0].scopeStack.length;
  for (let i = 1; i < stepExecutions.length; i++) {
    minDepth = Math.min(minDepth, stepExecutions[i].scopeStack.length);
  }

  return deriveAtDepth(stepExecutions, minDepth, minDepth);
};

const deriveAtDepth = (
  stepExecutions: WorkflowStepExecutionDto[],
  scopeDepth: number,
  minDepth: number
): JsonValue => {
  if (stepExecutions.length === 0) {
    return null;
  }

  const stepsAtThisLevel = stepExecutions.filter((step) => step.scopeStack.length === scopeDepth);
  if (stepsAtThisLevel.length === 0) {
    return null;
  }

  const stepsToProcess =
    scopeDepth === minDepth ? [stepsAtThisLevel[stepsAtThisLevel.length - 1]] : stepsAtThisLevel;

  const children = stepExecutions.filter((step) => {
    if (step.scopeStack.length !== scopeDepth + 1) return false;
    const lastFrame = step.scopeStack[step.scopeStack.length - 1];
    return stepsToProcess.some((parentStep) => lastFrame.stepId === parentStep.stepId);
  });

  if (children.length > 0) {
    const descendants = stepExecutions.filter((step) =>
      step.scopeStack.some((frame) =>
        stepsToProcess.some((parentStep) => frame.stepId === parentStep.stepId)
      )
    );
    return deriveAtDepth(descendants, scopeDepth + 1, minDepth);
  }

  if (scopeDepth === minDepth && stepsToProcess.length === 1) {
    return stepsToProcess[0].output ?? null;
  }

  const outputs = stepsToProcess
    .map((step) => step.output)
    .filter((output): output is JsonValue => output !== undefined);

  return outputs.length > 0 ? outputs : null;
};
