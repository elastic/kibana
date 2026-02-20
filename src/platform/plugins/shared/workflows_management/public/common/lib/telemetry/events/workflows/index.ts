/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RootSchema } from '@kbn/core/public';
import { workflowExecutionEventNames, workflowExecutionEventSchemas } from './execution';
import type { WorkflowExecutionEventTypes } from './execution/types';
import { workflowLifecycleEventNames, workflowLifecycleEventSchemas } from './lifecycle';
import type { WorkflowLifecycleEventTypes } from './lifecycle/types';
import type { WorkflowsTelemetryEvent, WorkflowsTelemetryEventsMap } from './types';
import { workflowUIEventNames, workflowUIEventSchemas } from './ui';
import type { WorkflowUIEventTypes } from './ui/types';
import { workflowValidationEventNames, workflowValidationEventSchemas } from './validation';
import type { WorkflowValidationEventTypes } from './validation/types';

// Re-export types for convenience
export type { WorkflowEditorType } from './types';
export * from './execution/types';
export * from './lifecycle/types';
export * from './ui/types';
export * from './validation/types';

export const workflowEventNames = {
  ...workflowExecutionEventNames,
  ...workflowLifecycleEventNames,
  ...workflowUIEventNames,
  ...workflowValidationEventNames,
};

// This type ensures that the event schemas are correctly typed according to the event type
type WorkflowsTelemetryEventSchemas = {
  [T in keyof WorkflowsTelemetryEventsMap]: RootSchema<WorkflowsTelemetryEventsMap[T]>;
};

const eventSchemas: WorkflowsTelemetryEventSchemas = {
  ...workflowExecutionEventSchemas,
  ...workflowLifecycleEventSchemas,
  ...workflowUIEventSchemas,
  ...workflowValidationEventSchemas,
};

export const workflowsTelemetryEvents: WorkflowsTelemetryEvent[] = Object.entries(eventSchemas).map(
  ([key, schema]) => ({
    eventType: key as
      | WorkflowExecutionEventTypes
      | WorkflowLifecycleEventTypes
      | WorkflowUIEventTypes
      | WorkflowValidationEventTypes,
    schema,
  })
);
