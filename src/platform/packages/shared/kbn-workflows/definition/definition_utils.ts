/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Step, WorkflowYaml } from '../spec/schema';
import {
  isForeachStep,
  isIfStep,
  isMergeStep,
  isParallelStep,
  isSwitchStep,
  isWhileStep,
} from '../types/utils';

/**
 * Returns all child step arrays for a control-flow step.
 * Centralises the structural knowledge so traversal helpers stay in sync.
 */
function getChildStepGroups(step: Step): Step[][] {
  const groups: Step[][] = [];

  if (
    (isForeachStep(step) || isWhileStep(step) || isMergeStep(step)) &&
    Array.isArray(step.steps)
  ) {
    groups.push(step.steps);
  }
  if (isIfStep(step)) {
    if (Array.isArray(step.steps)) groups.push(step.steps);
    if (Array.isArray(step.else)) groups.push(step.else);
  }
  if (isParallelStep(step) && Array.isArray(step.branches)) {
    for (const branch of step.branches) {
      groups.push(branch.steps);
    }
  }
  if (isSwitchStep(step)) {
    if (Array.isArray(step.cases)) {
      for (const c of step.cases) {
        groups.push(c.steps as Step[]);
      }
    }
    if (Array.isArray(step.default)) {
      groups.push(step.default as Step[]);
    }
  }

  return groups;
}

/**
 * Recursively collects all steps from a workflow definition, including those
 * nested inside control-flow steps (if/else, foreach, while, switch, parallel, merge).
 */
export function collectAllSteps(steps: WorkflowYaml['steps']): Step[] {
  const result: Step[] = [];
  for (const step of steps) {
    result.push(step);
    for (const group of getChildStepGroups(step)) {
      result.push(...collectAllSteps(group));
    }
  }
  return result;
}

export function getStepByNameFromNestedSteps(
  steps: WorkflowYaml['steps'],
  stepName: string
): Step | null {
  for (const step of steps) {
    if (step.name === stepName) {
      return step;
    }
    for (const group of getChildStepGroups(step)) {
      const found = getStepByNameFromNestedSteps(group, stepName);
      if (found) {
        return found;
      }
    }
  }
  return null;
}
