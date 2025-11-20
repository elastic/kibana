/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Step, WorkflowYaml } from '../spec/schema';
import { isForeachStep, isIfStep, isMergeStep, isParallelStep } from '../types/utils';

export function getStepByNameFromNestedSteps(
  steps: WorkflowYaml['steps'],
  stepName: string
): Step | null {
  for (const step of steps) {
    if (step.name === stepName) {
      return step;
    }
    if (isForeachStep(step) && Array.isArray(step.steps)) {
      const result = getStepByNameFromNestedSteps(step.steps, stepName);
      if (result) {
        return result;
      }
    }
    if (isIfStep(step) && Array.isArray(step.steps)) {
      const result = getStepByNameFromNestedSteps(step.steps, stepName);
      if (result) {
        return result;
      }
    }
    if (isIfStep(step) && Array.isArray(step.else)) {
      const result = getStepByNameFromNestedSteps(step.else, stepName);
      if (result) {
        return result;
      }
    }
    if (isParallelStep(step) && Array.isArray(step.branches)) {
      for (const branch of step.branches) {
        const result = getStepByNameFromNestedSteps(branch.steps, stepName);
        if (result) {
          return result;
        }
      }
    }
    if (isMergeStep(step) && Array.isArray(step.steps)) {
      const result = getStepByNameFromNestedSteps(step.steps, stepName);
      if (result) {
        return result;
      }
    }
  }
  return null;
}
