/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from '@kbn/workflows/spec/schema';
import { collectAllStepNames } from './validate_step_names';

const DEFAULT_MAX_STEPS = 150;

interface StepCountValidationError {
  count: number;
  maxSteps: number;
  message: string;
}

export interface StepCountValidationResult {
  isValid: boolean;
  errors: StepCountValidationError[];
}

export function validateStepCount(workflow: WorkflowYaml): StepCountValidationResult {
  const maxSteps =
    (workflow.settings as { 'max-steps'?: number } | undefined)?.['max-steps'] ?? DEFAULT_MAX_STEPS;

  const stepNames = collectAllStepNames(workflow.steps);

  const fallbackSteps = (
    workflow.settings as { 'on-failure'?: { fallback?: unknown } } | undefined
  )?.['on-failure']?.fallback;
  if (Array.isArray(fallbackSteps)) {
    stepNames.push(...collectAllStepNames(fallbackSteps as WorkflowYaml['steps']));
  }

  const count = stepNames.length;

  if (count > maxSteps) {
    return {
      isValid: false,
      errors: [
        {
          count,
          maxSteps,
          message: `Workflow exceeds the maximum of ${maxSteps} steps (found ${count}). Consider splitting into child workflows using 'workflow.execute'.`,
        },
      ],
    };
  }

  return { isValid: true, errors: [] };
}
