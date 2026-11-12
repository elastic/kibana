/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isRecord } from '@kbn/workflows-yaml';

// Visits every step in nested containers (steps, else, branches, on-failure, ...), skipping `with`,
// where step-shaped objects are data rather than steps.
const visitSteps = (node: unknown, visit: (step: Record<string, unknown>) => void): void => {
  if (Array.isArray(node)) {
    node.forEach((child) => visitSteps(child, visit));
    return;
  }
  if (!isRecord(node)) {
    return;
  }
  if (typeof node.type === 'string') {
    visit(node);
  }
  for (const [key, value] of Object.entries(node)) {
    if (key !== 'with') {
      visitSteps(value, visit);
    }
  }
};

// Callers only get the output of a run that completes; `failed` and `cancelled` fail the call.
const isCompletingOutputStep = (step: Record<string, unknown>): boolean =>
  step.type === 'workflow.output' && (step.status === undefined || step.status === 'completed');

// Whether running `steps` in order always reaches a `workflow.output` step, which ends the run.
// Only unconditional steps count, and an `if` step only when both of its branches end the run.
const alwaysEndsRun = (steps: unknown): boolean =>
  Array.isArray(steps) &&
  steps.some(
    (step) =>
      isRecord(step) &&
      step.if === undefined &&
      (step.type === 'workflow.output' ||
        (step.type === 'if' && alwaysEndsRun(step.steps) && alwaysEndsRun(step.else)))
  );

/**
 * Returns the output names a workflow's completing `workflow.output` steps set, including those in
 * its `on-failure` fallback. Undefined when a run can complete without one (callers then get its
 * last step's output), or when one of them sets a computed value.
 */
export const getReturnedOutputNames = (definition: unknown): string[] | undefined => {
  if (!isRecord(definition) || !alwaysEndsRun(definition.steps)) {
    return undefined;
  }
  const names = new Set<string>();
  let hasOutputStep = false;
  let isComputed = false;
  const workflowOnFailure = isRecord(definition.settings)
    ? definition.settings['on-failure']
    : undefined;
  const workflowFallback = isRecord(workflowOnFailure) ? workflowOnFailure.fallback : undefined;
  visitSteps([definition.steps, workflowFallback], (step) => {
    if (!isCompletingOutputStep(step)) {
      return;
    }
    hasOutputStep = true;
    if (isRecord(step.with)) {
      Object.keys(step.with).forEach((name) => names.add(name));
    } else {
      isComputed = true;
    }
  });
  return hasOutputStep && !isComputed ? [...names] : undefined;
};
