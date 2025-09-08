/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from '@kbn/workflows/spec/schema';

interface StepNameValidationError {
  stepName: string;
  occurrences: number;
  message: string;
}

export interface StepNameValidationResult {
  isValid: boolean;
  errors: StepNameValidationError[];
}

/**
 * Collects all step names from a workflow definition recursively
 */
function collectAllStepNames(steps: WorkflowYaml['steps']): string[] {
  const stepNames: string[] = [];

  if (!steps || !Array.isArray(steps)) {
    return stepNames;
  }

  for (const step of steps) {
    if (step.name) {
      stepNames.push(step.name);
    }

    // Handle nested steps in different step types
    if (step.type === 'foreach' && 'steps' in step && step.steps) {
      stepNames.push(...collectAllStepNames(step.steps as WorkflowYaml['steps']));
    }

    if (step.type === 'if' && 'steps' in step && step.steps) {
      stepNames.push(...collectAllStepNames(step.steps as WorkflowYaml['steps']));

      // Handle else branch
      if ('else' in step && step.else) {
        stepNames.push(...collectAllStepNames(step.else as WorkflowYaml['steps']));
      }
    }

    if (step.type === 'atomic' && 'steps' in step && step.steps) {
      stepNames.push(...collectAllStepNames(step.steps as WorkflowYaml['steps']));
    }

    if (step.type === 'merge' && 'steps' in step && step.steps) {
      stepNames.push(...collectAllStepNames(step.steps as WorkflowYaml['steps']));
    }

    if (step.type === 'parallel' && 'branches' in step && step.branches) {
      for (const branch of step.branches) {
        if (branch.steps) {
          stepNames.push(...collectAllStepNames(branch.steps as WorkflowYaml['steps']));
        }
      }
    }
  }

  return stepNames;
}

/**
 * Validates that all step names in a workflow are unique
 */
export function validateStepNameUniqueness(workflow: WorkflowYaml): StepNameValidationResult {
  const stepNames = collectAllStepNames(workflow.steps);
  const stepNameCounts = new Map<string, number>();
  const errors: StepNameValidationError[] = [];

  // Count occurrences of each step name
  for (const stepName of stepNames) {
    stepNameCounts.set(stepName, (stepNameCounts.get(stepName) || 0) + 1);
  }

  // Find duplicates
  for (const [stepName, count] of stepNameCounts) {
    if (count > 1) {
      errors.push({
        stepName,
        occurrences: count,
        message: `Step name "${stepName}" is not unique. Found ${count} steps with this name.`,
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
