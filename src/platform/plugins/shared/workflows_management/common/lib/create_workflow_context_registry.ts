/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';
import type { WorkflowContextRegistry } from '@kbn/workflows-yaml';
import { stepSchemas } from '../step_schemas';

interface TriggerDefinitionLookup {
  getTriggerDefinition(triggerId: string): CommonTriggerDefinition | undefined;
}

/**
 * Adapts the plugin's step and trigger registries to the contract
 * `@kbn/workflows-yaml` needs to build the workflow context schema. Called once
 * per surface at plugin start.
 */
export function createWorkflowContextRegistry(
  triggers: TriggerDefinitionLookup
): WorkflowContextRegistry {
  return {
    getStepOutput: (stepTypeId) => {
      const stepDefinition = stepSchemas.getStepDefinition(stepTypeId);
      // Only public definitions carry the editor's dynamic-schema handler, and the
      // server has never contributed step output schemas here.
      if (!stepDefinition || !stepSchemas.isPublicStepDefinition(stepDefinition)) {
        return undefined;
      }
      const getOutputSchema = stepDefinition.editorHandlers?.dynamicSchema?.getOutputSchema;
      return {
        outputSchema: stepDefinition.outputSchema,
        getDynamicOutputSchema: getOutputSchema ? (args) => getOutputSchema(args) : undefined,
      };
    },
    getConnector: (stepTypeId) => stepSchemas.getAllConnectorsMapCache()?.get(stepTypeId),
    getTriggerDefinition: (triggerType) => triggers.getTriggerDefinition(triggerType),
  };
}
