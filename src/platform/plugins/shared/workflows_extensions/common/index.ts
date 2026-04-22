/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type { CommonStepDefinition, StepDocMetadata } from './step_registry/types';
export type { CommonTriggerDefinition, TriggerDocMetadata } from './trigger_registry/types';
export { EVENT_FIELD_PREFIX } from './trigger_registry/constants';
export { DataMapStepTypeId } from './steps/data';
export {
  WORKFLOW_EXECUTION_FAILED_TRIGGER_ID,
  workflowExecutionFailedEventSchema,
  commonWorkflowExecutionFailedTriggerDefinition,
} from './triggers';
export type { WorkflowExecutionFailedEvent } from './triggers';
