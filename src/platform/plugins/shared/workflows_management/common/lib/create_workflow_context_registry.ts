/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublicStepDefinition } from '@kbn/workflows-extensions/public';
import type { ServerStepDefinition } from '@kbn/workflows-extensions/server';
import type {
  CalledWorkflowOutputs,
  RegisteredStepOutput,
  WorkflowContextRegistry,
} from '@kbn/workflows-yaml';
import { isRecord } from '@kbn/workflows-yaml';
import { getReturnedOutputNames } from './get_returned_output_names';
import { stepSchemas, type WorkflowsExtensions } from '../step_schemas';

/** What a caller can read from the output of a workflow, given its stored definition. */
export const toCalledWorkflowOutputs = ({
  name,
  definition,
}: {
  name: string;
  definition: unknown;
}): CalledWorkflowOutputs => ({
  name,
  outputs: isRecord(definition) ? definition.outputs : undefined,
  returnedOutputNames: getReturnedOutputNames(definition),
});

/** Output-schema contributions of a registered step. */
export function toRegisteredStepOutput(
  stepDefinition: PublicStepDefinition | ServerStepDefinition | undefined
): RegisteredStepOutput | undefined {
  if (!stepDefinition) {
    return undefined;
  }
  const dynamicSchema =
    'editorHandlers' in stepDefinition ? stepDefinition.editorHandlers?.dynamicSchema : undefined;
  return {
    outputSchema: stepDefinition.outputSchema,
    getDynamicOutputSchema: dynamicSchema?.getOutputSchema?.bind(dynamicSchema),
  };
}

/**
 * Browser registry: connectors come from the singleton cache the
 * connector-loading thunk fills. The server composes its own per request.
 */
export function createWorkflowContextRegistry(
  workflowsExtensions: WorkflowsExtensions,
  getCalledWorkflowOutputs?: WorkflowContextRegistry['getCalledWorkflowOutputs']
): WorkflowContextRegistry {
  return {
    getStepOutput: (stepTypeId) =>
      toRegisteredStepOutput(workflowsExtensions.getStepDefinition(stepTypeId)),
    getConnector: (stepTypeId) => stepSchemas.getAllConnectorsMapCache()?.get(stepTypeId),
    getTriggerDefinition: (triggerType) => workflowsExtensions.getTriggerDefinition(triggerType),
    getCalledWorkflowOutputs,
  };
}
