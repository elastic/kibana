/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from '@kbn/workflows';
import {
  assertWorkflowLinearForSync,
  SyncModeNotSupportedError,
} from '@kbn/workflows-execution-engine/server';
import type {
  ServerStepDefinition,
  ServerTriggerDefinition,
} from '@kbn/workflows-extensions/server';

export interface WorkflowRegistrationError {
  type: 'capability_mismatch' | 'non_linear_sync';
  message: string;
}

/**
 * Server-side registration-time checks that run after YAML parsing succeeds.
 *
 * 1. Capability subset: for every step in the workflow, verifies that each key
 *    in step.requiresCapabilities is present in the trigger's providesCapabilities.
 *    Fails with a descriptive error listing the missing keys.
 *
 * 2. Linear-only guard: for sync-mode triggers (sync.inlineExecution === true),
 *    verifies the workflow contains no branching or looping constructs. This is
 *    the primary enforcement site; executeWorkflowSync has a defense-in-depth copy.
 *
 * Returns an array of errors; empty means the workflow passes all checks.
 */
export const validateWorkflowOnRegister = (
  workflowId: string,
  definition: WorkflowYaml,
  triggerDefinitions: ServerTriggerDefinition[],
  getStepDefinition: (stepType: string) => ServerStepDefinition | undefined
): WorkflowRegistrationError[] => {
  const errors: WorkflowRegistrationError[] = [];

  const triggerTypes = (definition.triggers ?? [])
    .map((t) =>
      t && typeof (t as { type?: string }).type === 'string' ? (t as { type: string }).type : null
    )
    .filter((t): t is string => t != null);

  for (const triggerType of triggerTypes) {
    const triggerDef = triggerDefinitions.find((d) => d.id === triggerType);
    if (triggerDef) {
      const provided = new Set(triggerDef.providesCapabilities ?? []);

      // Capability subset check
      for (const step of definition.steps ?? []) {
        const stepType = (step as { type?: string }).type ?? '';
        const stepName = (step as { name?: string }).name ?? stepType;
        const stepDef = getStepDefinition(stepType);
        if (stepDef) {
          const missing = (stepDef.requiresCapabilities ?? []).filter((k) => !provided.has(k));
          if (missing.length > 0) {
            errors.push({
              type: 'capability_mismatch',
              message:
                `Workflow "${workflowId}" step "${stepName}" (type "${stepType}") requires ` +
                `capabilities [${missing.join(', ')}] but trigger "${triggerType}" only provides ` +
                `[${[...provided].join(', ') || 'none'}].`,
            });
          }
        }
      }

      // Linear-only check for sync-mode triggers
      if (triggerDef.sync?.inlineExecution) {
        try {
          assertWorkflowLinearForSync(workflowId, definition);
        } catch (err) {
          if (err instanceof SyncModeNotSupportedError) {
            errors.push({
              type: 'non_linear_sync',
              message: err.message,
            });
          }
        }
      }
    }
  }

  return errors;
};
