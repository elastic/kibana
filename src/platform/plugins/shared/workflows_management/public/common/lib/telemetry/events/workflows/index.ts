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
import { workflowLifecycleEventNames, workflowLifecycleEventSchemas } from './lifecycle';
import type {
  BaseResultActionParams,
  WorkflowExecutionEventTypes,
  WorkflowLifecycleEventTypes,
  WorkflowsTelemetryEvent,
  WorkflowsTelemetryEventsMap,
  WorkflowUIEventTypes,
} from './types';
import { workflowUIEventNames, workflowUIEventSchemas } from './ui';
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

const baseResultActionSchema: RootSchema<BaseResultActionParams> = {
  result: {
    type: 'keyword',
    _meta: {
      description:
        'Indicates whether the action/request succeeded or failed. Can be one of `success` or `failed`. This event tracks the attempt, not just successful outcomes.',
      optional: false,
    },
  },
  errorMessage: {
    type: 'text',
    _meta: {
      description:
        'The error message if the action/request failed. Only present when result is `failed`.',
      optional: true,
    },
  },
};

const eventNameSchema: RootSchema<{ eventName: string }> = {
  eventName: {
    type: 'keyword',
    _meta: {
      description: 'The event name/description',
      optional: false,
    },
  },
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
