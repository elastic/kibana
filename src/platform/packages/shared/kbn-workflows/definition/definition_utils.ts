/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ForEachStep,
  IfStep,
  MergeStep,
  ParallelStep,
  Step,
  WorkflowYaml,
} from '../spec/schema';

export function getStepByNameFromNestedSteps(
  steps: WorkflowYaml['steps'],
  stepName: string
): Step | null {
  for (const step of steps) {
    if (step.name === stepName) {
      return step;
    }
    if (step.type === 'foreach' && 'steps' in step) {
      const result = getStepByNameFromNestedSteps((step as ForEachStep).steps, stepName);
      if (result) {
        return result;
      }
    }
    if (step.type === 'if' && 'steps' in step) {
      const result = getStepByNameFromNestedSteps((step as IfStep).steps, stepName);
      if (result) {
        return result;
      }
    }
    if (step.type === 'if' && 'else' in step) {
      const result = getStepByNameFromNestedSteps((step as IfStep).else!, stepName);
      if (result) {
        return result;
      }
    }
    if (step.type === 'parallel' && 'branches' in step) {
      for (const branch of (step as ParallelStep).branches!) {
        const result = getStepByNameFromNestedSteps(branch.steps, stepName);
        if (result) {
          return result;
        }
      }
    }
    if (step.type === 'merge' && 'steps' in step) {
      const result = getStepByNameFromNestedSteps((step as MergeStep).steps, stepName);
      if (result) {
        return result;
      }
    }
  }
  return null;
}
