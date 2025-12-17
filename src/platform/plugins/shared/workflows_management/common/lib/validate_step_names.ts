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

    // Collect nested step names using a generic approach
    stepNames.push(...collectNestedStepNames(step));
  }

  return stepNames;
}

/**
 * Helper function to collect step names from nested structures
 */
function collectNestedStepNames(step: unknown): string[] {
  const stepNames: string[] = [];

  // Handle steps property (foreach, if, atomic, merge)
  const s = step as { steps?: unknown; else?: unknown; branches?: Array<{ steps?: unknown }> };
  if (s.steps && Array.isArray(s.steps)) {
    stepNames.push(...collectAllStepNames(s.steps as WorkflowYaml['steps']));
  }

  // Handle else branch for if steps
  if (s.else && Array.isArray(s.else)) {
    stepNames.push(...collectAllStepNames(s.else as WorkflowYaml['steps']));
  }

  // Handle branches for parallel steps
  if (s.branches && Array.isArray(s.branches)) {
    for (const branch of s.branches) {
      if (branch.steps && Array.isArray(branch.steps)) {
        stepNames.push(...collectAllStepNames(branch.steps as WorkflowYaml['steps']));
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
