/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RootSchema } from '@kbn/core/public';
import { workflowAiChatEventNames, workflowAiChatEventSchemas } from './ai_chat';
import type { WorkflowAiChatEventTypes } from './ai_chat/types';
import { workflowExecutionEventNames, workflowExecutionEventSchemas } from './execution';
import type { WorkflowExecutionEventTypes } from './execution/types';
import { workflowImportExportEventNames, workflowImportExportEventSchemas } from './import_export';
import type { WorkflowImportExportEventTypes } from './import_export/types';
import { workflowLifecycleEventNames, workflowLifecycleEventSchemas } from './lifecycle';
import type { WorkflowLifecycleEventTypes } from './lifecycle/types';
import type { WorkflowsTelemetryEvent, WorkflowsTelemetryEventsMap } from './types';
import { workflowUIEventNames, workflowUIEventSchemas } from './ui';
import type { WorkflowUIEventTypes } from './ui/types';
import { workflowValidationEventNames, workflowValidationEventSchemas } from './validation';
import type { WorkflowValidationEventTypes } from './validation/types';

// Re-export types for convenience
export type { WorkflowEditorType } from './types';
export * from './ai_chat/types';
export * from './execution/types';
export * from './import_export/types';
export * from './lifecycle/types';
export * from './ui/types';
export * from './validation/types';

export const workflowEventNames = {
  ...workflowAiChatEventNames,
  ...workflowExecutionEventNames,
  ...workflowImportExportEventNames,
  ...workflowLifecycleEventNames,
  ...workflowUIEventNames,
  ...workflowValidationEventNames,
};

// This type ensures that the event schemas are correctly typed according to the event type
type WorkflowsTelemetryEventSchemas = {
  [T in keyof WorkflowsTelemetryEventsMap]: RootSchema<WorkflowsTelemetryEventsMap[T]>;
};

const eventSchemas: WorkflowsTelemetryEventSchemas = {
  ...workflowAiChatEventSchemas,
  ...workflowExecutionEventSchemas,
  ...workflowImportExportEventSchemas,
  ...workflowLifecycleEventSchemas,
  ...workflowUIEventSchemas,
  ...workflowValidationEventSchemas,
};

export const workflowsTelemetryEvents: WorkflowsTelemetryEvent[] = Object.entries(eventSchemas).map(
  ([key, schema]) => ({
    eventType: key as
      | WorkflowAiChatEventTypes
      | WorkflowExecutionEventTypes
      | WorkflowImportExportEventTypes
      | WorkflowLifecycleEventTypes
      | WorkflowUIEventTypes
      | WorkflowValidationEventTypes,
    schema,
  })
);
