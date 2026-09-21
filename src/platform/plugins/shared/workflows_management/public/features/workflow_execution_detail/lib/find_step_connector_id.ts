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
 * Returns the step's configured `connector-id` from the workflow definition, if any.
 */
export const findStepConnectorId = (
  definition: WorkflowYaml | null | undefined,
  stepName: string
): string | undefined => {
  if (!definition?.steps || !stepName) {
    return undefined;
  }
  let found: string | undefined;
  walkSteps(definition.steps, (step) => {
    if (found != null) return;
    if (step.name !== stepName) return;
    const connectorId = (step as { 'connector-id'?: unknown })['connector-id'];
    if (typeof connectorId === 'string' && connectorId.length > 0) {
      found = connectorId;
    }
  });
  return found;
};
