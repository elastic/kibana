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

/** Whether a step is a `workflow.output` that completes the run; `failed` and `cancelled` fail the call. */
export const isCompletingOutputStep = (step: Record<string, unknown>): boolean =>
  step.type === 'workflow.output' && (step.status === undefined || step.status === 'completed');

/** Whether a step has an `if`, so it might be skipped; an empty `if` always runs, as in the engine. */
export const hasCondition = (step: Record<string, unknown>): boolean => Boolean(step.if);

// Whether running `steps` in order always reaches a `workflow.output` or `workflow.fail` step, which
// ends the run.
// Only unconditional steps count, and an `if` step only when both of its branches end the run.
const alwaysEndsRun = (steps: unknown): boolean =>
  Array.isArray(steps) &&
  steps.some(
    (step) =>
      isRecord(step) &&
      !hasCondition(step) &&
      (step.type === 'workflow.output' ||
        step.type === 'workflow.fail' ||
        (step.type === 'if' && alwaysEndsRun(step.steps) && alwaysEndsRun(step.else)))
  );

/**
 * Whether every run of a workflow ends in a `workflow.output` or `workflow.fail` step. Otherwise a
 * run can complete without one, and callers get its last step's output.
 */
export const alwaysReturnsWorkflowOutput = (definition: unknown): boolean =>
  isRecord(definition) && alwaysEndsRun(definition.steps);

/** Whether a step or list of steps (or one nested in them) might complete the run. */
export const containsCompletingOutputStep = (steps: unknown): boolean => {
  let found = false;
  visitSteps(steps, (child) => {
    found = found || isCompletingOutputStep(child);
  });
  return found;
};

/**
 * Returns the `workflow.output` or `workflow.fail` step that every run of a workflow reaches
 * unless it fails first: an unconditional top-level one, with no step before it that might
 * complete the run. Undefined otherwise.
 */
export const getFinalEndStep = (definition: unknown): Record<string, unknown> | undefined => {
  const steps = isRecord(definition) && Array.isArray(definition.steps) ? definition.steps : [];
  for (const step of steps.filter(isRecord)) {
    if ((step.type === 'workflow.output' || step.type === 'workflow.fail') && !hasCondition(step)) {
      return step;
    }
    if (containsCompletingOutputStep(step)) {
      return undefined;
    }
  }
  return undefined;
};

/**
 * Returns the output names a workflow's completing `workflow.output` steps set, including those in
 * its `on-failure` fallback. Undefined when a run can complete without one (callers then get its
 * last step's output), or when one of them sets a computed value.
 */
export const getReturnedOutputNames = (definition: unknown): string[] | undefined => {
  if (!isRecord(definition) || !alwaysReturnsWorkflowOutput(definition)) {
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
