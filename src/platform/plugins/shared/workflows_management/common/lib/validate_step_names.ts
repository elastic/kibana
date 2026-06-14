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
 * Collects all step names from a sequential list of steps (a single scope).
 * Steps inside parallel branches are NOT included — each branch is a separate
 * execution scope and its step names are validated independently.
 */
function collectScopedStepNames(steps: WorkflowYaml['steps']): string[] {
  const stepNames: string[] = [];

  if (!steps || !Array.isArray(steps)) {
    return stepNames;
  }

  for (const step of steps) {
    if (step.name) {
      stepNames.push(step.name);
    }
    // Collect from sequential nested step lists (foreach, if, while, merge, on-failure)
    stepNames.push(...collectNestedSequentialStepNames(step));
  }

  return stepNames;
}

/**
 * Extracts the fallback steps array from an on-failure block, if present.
 */
function getOnFailureFallbackSteps(
  obj: { 'on-failure'?: { fallback?: unknown } } | undefined
): WorkflowYaml['steps'] | undefined {
  const fallback = obj?.['on-failure']?.fallback;
  return Array.isArray(fallback) ? (fallback as WorkflowYaml['steps']) : undefined;
}

/**
 * Returns the errors from parallel branches themselves (validates each branch independently).
 */
function validateParallelBranches(branches: Array<{ steps?: unknown }>): StepNameValidationError[] {
  const errors: StepNameValidationError[] = [];
  for (const branch of branches) {
    if (branch.steps && Array.isArray(branch.steps)) {
      // Each branch is an independent execution scope; validate within it
      const branchErrors = validateStepList(branch.steps as WorkflowYaml['steps']);
      errors.push(...branchErrors);
    }
  }
  return errors;
}

/**
 * Collects step names from sequential nested containers (foreach body, if/else,
 * on-failure fallback). Parallel branches are NOT included here — they are
 * validated separately to avoid false-positive duplicate detection.
 */
function collectNestedSequentialStepNames(step: unknown): string[] {
  const stepNames: string[] = [];

  const s = step as {
    steps?: unknown;
    else?: unknown;
    branches?: Array<{ steps?: unknown }>;
    'on-failure'?: { fallback?: unknown };
  };

  // Handle steps property (foreach, if, while, merge) — these are sequential
  if (s.steps && Array.isArray(s.steps)) {
    stepNames.push(...collectScopedStepNames(s.steps as WorkflowYaml['steps']));
  }

  // Handle else branch for if steps — sequential
  if (s.else && Array.isArray(s.else)) {
    stepNames.push(...collectScopedStepNames(s.else as WorkflowYaml['steps']));
  }

  // Parallel branches are intentionally omitted here — validated separately below

  const fallbackSteps = getOnFailureFallbackSteps(s);
  if (fallbackSteps) {
    stepNames.push(...collectScopedStepNames(fallbackSteps));
  }

  return stepNames;
}

/**
 * Validates step name uniqueness within a single sequential step list (one scope).
 * Also recursively validates parallel branches, which each form their own scope.
 */
function validateStepList(steps: WorkflowYaml['steps']): StepNameValidationError[] {
  const errors: StepNameValidationError[] = [];

  if (!steps || !Array.isArray(steps)) {
    return errors;
  }

  // Check uniqueness within this scope (excluding parallel branch internals)
  const scopedNames = collectScopedStepNames(steps);
  const nameCount = new Map<string, number>();
  for (const name of scopedNames) {
    nameCount.set(name, (nameCount.get(name) ?? 0) + 1);
  }
  for (const [name, count] of nameCount) {
    if (count > 1) {
      errors.push({
        stepName: name,
        occurrences: count,
        message: `Step name "${name}" is not unique. Found ${count} steps with this name.`,
      });
    }
  }

  // Recursively validate parallel branches as independent scopes
  for (const step of steps) {
    const s = step as { branches?: Array<{ steps?: unknown }> };
    if (s.branches && Array.isArray(s.branches)) {
      errors.push(...validateParallelBranches(s.branches));
    }
  }

  return errors;
}

/**
 * Validates that all step names in a workflow are unique within their execution scope.
 * Steps inside parallel branches are validated per-branch and are allowed to share
 * names with steps in other branches (they run in separate namespaces).
 */
export function validateStepNameUniqueness(workflow: WorkflowYaml): StepNameValidationResult {
  const errors = validateStepList(workflow.steps);

  const workflowLevelFallback = getOnFailureFallbackSteps(
    workflow.settings as { 'on-failure'?: { fallback?: unknown } } | undefined
  );
  if (workflowLevelFallback) {
    errors.push(...validateStepList(workflowLevelFallback));
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
