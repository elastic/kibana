/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Event schemas + registration metadata (consumed by the stateful telemetry
// client back in the plugin).
export {
  workflowExecutionEventNames,
  workflowExecutionEventSchemas,
} from './events/workflows_execution';

// Event-parameter types and the event-name enum.
export { WorkflowExecutionTelemetryEventTypes } from './events/workflows_execution/types';
export type {
  BaseWorkflowExecutionTelemetryParams,
  EventDrivenExecutionSuppressedParams,
  TriggerEventDispatchedParams,
  WorkflowExecutionCancelledParams,
  WorkflowExecutionCompletedParams,
  WorkflowExecutionFailedParams,
  WorkflowExecutionTelemetryEventParams,
  WorkflowExecutionTelemetryEventsMap,
} from './events/workflows_execution/types';

// Pure extractors. The telemetry client wraps these and emits events; the
// extractors themselves have no I/O.
export {
  extractAlertRuleId,
  extractCompositionContext,
  extractEventChainDepthFromExecution,
  extractEventChainVisitedWorkflowIdsFromExecution,
  extractExecutionMetadata,
  extractQueueDelayMs,
  extractTimeToFirstStep,
  mergeEmitterWorkflowIntoEventChainVisited,
  normalizeEventChainVisitedWorkflowIds,
} from './utils/extract_execution_metadata';
export type { WorkflowExecutionTelemetryMetadata } from './utils/extract_execution_metadata';

export { extractWorkflowMetadata } from './utils/extract_workflow_metadata';
export type { WorkflowTelemetryMetadata } from './utils/extract_workflow_metadata';
