/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from '@kbn/workflows';

type WorkflowStep = WorkflowYaml['steps'][number];

export interface StepRetryConfig {
  delay?: string;
  maxAttempts?: number;
}

const walkSteps = (steps: WorkflowStep[] | undefined, visit: (step: WorkflowStep) => void) => {
  if (!steps) return;
  for (const step of steps) {
    visit(step);
    const nested = step as WorkflowStep & {
      steps?: WorkflowStep[];
      else?: WorkflowStep[];
      branches?: Array<{ steps?: WorkflowStep[] }>;
      cases?: Array<{ steps?: WorkflowStep[] }>;
      default?: { steps?: WorkflowStep[] };
    };
    walkSteps(nested.steps, visit);
    walkSteps(nested.else, visit);
    for (const branch of nested.branches ?? []) {
      walkSteps(branch.steps, visit);
    }
    for (const c of nested.cases ?? []) {
      walkSteps(c.steps, visit);
    }
    walkSteps(nested.default?.steps, visit);
  }
};

/**
 * Returns configured `on-failure.retry` fields for a step by name, if present.
 */
export const findStepRetryConfig = (
  definition: WorkflowYaml | null | undefined,
  stepName: string
): StepRetryConfig | undefined => {
  if (!definition?.steps || !stepName) {
    return undefined;
  }
  let found: StepRetryConfig | undefined;
  walkSteps(definition.steps, (step) => {
    if (found != null) return;
    if (step.name !== stepName) return;
    const retry = (
      step as { 'on-failure'?: { retry?: { delay?: string; 'max-attempts'?: number } } }
    )['on-failure']?.retry;
    if (!retry) return;
    found = {
      delay: retry.delay,
      maxAttempts: retry['max-attempts'],
    };
  });
  return found;
};

/** @deprecated Prefer findStepRetryConfig — kept for delay-only call sites. */
export const findStepRetryDelay = (
  definition: WorkflowYaml | null | undefined,
  stepName: string
): string | undefined => findStepRetryConfig(definition, stepName)?.delay;
