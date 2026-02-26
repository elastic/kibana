/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { WorkflowYaml } from '@kbn/workflows';
import { isTriggerType, validateKqlAgainstSchema } from '@kbn/workflows';
import { EVENT_FIELD_PREFIX } from '@kbn/workflows-extensions/common';
import type { z } from '@kbn/zod/v4';

export interface TriggerDefinitionForConditionValidation {
  eventSchema: z.ZodType;
}

export interface TriggerConditionValidationError {
  triggerIndex: number;
  message: string;
}

/**
 * Validates that each custom trigger's `with.condition` is valid KQL and only
 * references properties from that trigger's eventSchema.
 */
export function validateTriggerConditionsForWorkflow(
  workflow: WorkflowYaml,
  getTriggerDefinition: (triggerType: string) => TriggerDefinitionForConditionValidation | undefined
): { valid: boolean; errors: TriggerConditionValidationError[] } {
  const errors: TriggerConditionValidationError[] = [];
  const triggers = workflow.triggers ?? [];

  for (let i = 0; i < triggers.length; i++) {
    const trigger = triggers[i];
    const type = trigger?.type;
    if (typeof type === 'string' && !isTriggerType(type)) {
      const condition =
        trigger && 'with' in trigger
          ? (trigger.with as { condition?: string } | undefined)?.condition
          : undefined;
      if (condition != null && condition !== '') {
        const conditionStr = typeof condition === 'string' ? condition : String(condition);
        const definition = getTriggerDefinition(type);
        if (definition?.eventSchema) {
          const result = validateKqlAgainstSchema(conditionStr, definition.eventSchema, {
            fieldPrefix: EVENT_FIELD_PREFIX,
          });
          if (!result.valid) {
            errors.push({
              triggerIndex: i,
              message:
                result.error ??
                i18n.translate('workflowsManagement.validateTriggerConditions.fallbackError', {
                  defaultMessage:
                    'Condition must be valid KQL and only reference event schema properties.',
                }),
            });
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export interface TriggerDefinitionForValidateTriggers {
  id: string;
  eventSchema: z.ZodType;
}

/**
 * Centralized validation of all triggers in workflow YAML (conditions and any other criteria).
 * Use this from the service layer; it delegates to validateTriggerConditionsForWorkflow.
 */
export function validateTriggers(
  workflow: WorkflowYaml,
  triggerDefinitions: TriggerDefinitionForValidateTriggers[]
): { valid: boolean; errors: TriggerConditionValidationError[] } {
  const getTriggerDefinition = (triggerType: string) =>
    triggerDefinitions.find((d) => d.id === triggerType);
  return validateTriggerConditionsForWorkflow(workflow, getTriggerDefinition);
}
