/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Step } from '../graph_layout/types';
import { walkStepTree } from '../graph_layout/walk_step_tree';
import type { WorkflowYaml } from '../spec/schema';

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
 * Validates that all step names in a workflow are unique.
 * Uses `walkStepTree` to cover every slot: `steps`, `else`, `branches[]`,
 * `cases[]`, `default`, `on-failure.fallback`, `iteration-on-failure.fallback`.
 */
export function validateStepNameUniqueness(workflow: WorkflowYaml): StepNameValidationResult {
  const steps = (workflow.steps ?? []) as ReadonlyArray<Step>;
  const stepNameCounts = new Map<string, number>();

  walkStepTree(steps, (step) => {
    if (step.name) {
      stepNameCounts.set(step.name, (stepNameCounts.get(step.name) ?? 0) + 1);
    }
  });

  // Also walk any workflow-level on-failure.fallback steps
  const workflowSettings = workflow.settings as
    | { 'on-failure'?: { fallback?: unknown } }
    | undefined;
  const workflowFallback = workflowSettings?.['on-failure']?.fallback;
  if (Array.isArray(workflowFallback)) {
    walkStepTree(workflowFallback as ReadonlyArray<Step>, (step) => {
      if (step.name) {
        stepNameCounts.set(step.name, (stepNameCounts.get(step.name) ?? 0) + 1);
      }
    });
  }

  const errors: StepNameValidationError[] = [];
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
