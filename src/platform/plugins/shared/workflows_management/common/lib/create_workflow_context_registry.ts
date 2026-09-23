/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowContextRegistry } from '@kbn/workflows-yaml';
import { stepSchemas, type WorkflowsExtensions } from '../step_schemas';

export function createWorkflowContextRegistry(
  workflowsExtensions: WorkflowsExtensions
): WorkflowContextRegistry {
  return {
    getStepOutput: (stepTypeId) => stepSchemas.getStepOutput(stepTypeId),
    getConnector: (stepTypeId) => stepSchemas.getAllConnectorsMapCache()?.get(stepTypeId),
    getTriggerDefinition: (triggerType) => workflowsExtensions.getTriggerDefinition(triggerType),
  };
}
