/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WellKnownWorkflowTriggerSource } from '@kbn/workflows';

/**
 * Base parameters for all workflow execution telemetry events
 */
export interface BaseWorkflowExecutionTelemetryParams {
  /**
   * The workflow execution ID
   */
  workflowExecutionId: string;
  /**
   * The workflow ID
   */
  workflowId: string;
  /**
   * The space ID
   */
  spaceId: string;
  /**
   * How the workflow was triggered: built-in sources, 'workflow-step' for sub-workflows, or 'event' for event-driven trigger ids.
   */
  triggerType: WellKnownWorkflowTriggerSource | 'event';
  /**
   * Registered event trigger id when triggerType is 'event' (e.g. cases.caseCreated).
   * Omitted for built-in trigger types.
   */
  eventTriggerId?: string;
  /**
   * Whether this is a test run
   */
  isTestRun: boolean;
  /**
   * The alert rule ID if triggered by alert. Only present when triggerType is 'alert'.
   */
  ruleId?: string;
  /**
   * Cross-workflow nesting depth for sub-workflow executions (1 = direct child).
   * Only present for sub-workflow executions.
   */
  compositionDepth?: number;
  /**
   * The workflow ID of the parent workflow that invoked this sub-workflow.
   * Only present for sub-workflow executions.
   */
  parentWorkflowId?: string;
  /**
   * Whether the parent used workflow.execute (sync) or workflow.executeAsync to start this run.
   * Only present for sub-workflow executions when recorded on the execution context.
   */
  parentWorkflowInvocation?: 'sync' | 'async';
  /**
   * Event-chain depth for runs scheduled via event-driven emits.
   * Not sub-workflow composition; omitted when absent.
   */
  eventChainDepth?: number;
}

/** Output size statistics derived from WorkflowExecutionState. */
export interface OutputSizeStats {
  totalBytes: number;
  stepCount: number;
}

/** Telemetry fields for output size metrics, shared across terminal event types. */
export interface OutputSizeTelemetryFields {
  /**
   * Total output size in bytes across all steps with recorded sizes.
   * Only includes atomic steps measured by Layer 2 enforcement.
   */
  totalOutputSizeBytes?: number;
  /**
   * Average output size per step in bytes.
   * Computed from steps with recorded sizes only.
   */
  averageOutputSizeBytes?: number;
}

/**
 * Event types for workflow execution telemetry
 */
export enum WorkflowExecutionTelemetryEventTypes {
  /**
   * When a workflow execution completes successfully
   */
  WorkflowExecutionCompleted = 'workflows_execution_workflow_completed',
  /**
   * When a workflow execution fails
   */
  WorkflowExecutionFailed = 'workflows_execution_workflow_failed',
  /**
   * When a workflow execution is cancelled
   */
  WorkflowExecutionCancelled = 'workflows_execution_workflow_cancelled',
  /**
   * When an event-driven run is marked skipped at task runtime because execution was disabled after scheduling.
   */
  EventDrivenExecutionSuppressed = 'workflows_event_driven_execution_suppressed',
  /**
   * When a trigger event is dispatched (emitEvent called) and workflows are resolved/scheduled.
   */
  TriggerEventDispatched = 'workflows_trigger_event_dispatched',
}

/**
 * Event-driven execution was skipped in runWorkflow after a task was already scheduled (operator kill switch flipped).
 *
 * Omits composition fields (`compositionDepth`, `parentWorkflowId`, `parentWorkflowInvocation`): suppression is for
 * event-driven executions, not sub-workflow composition. Includes optional `eventChainDepth` when persisted on the execution.
 */
export interface EventDrivenExecutionSuppressedParams
  extends Omit<
    BaseWorkflowExecutionTelemetryParams,
    'compositionDepth' | 'parentWorkflowId' | 'parentWorkflowInvocation'
  > {
  eventName: string;
  logTriggerEventsEnabled: boolean;
}

/**
 * Parameters for workflow execution completed event
 */
export interface WorkflowExecutionCompletedParams
  extends BaseWorkflowExecutionTelemetryParams,
    OutputSizeTelemetryFields {
  eventName: string;
  /**
   * Timestamp when the execution started (ISO string)
   */
  startedAt: string;
  /**
   * Timestamp when the execution completed (ISO string)
   */
  completedAt: string;
  /**
   * Total execution duration in milliseconds
   */
  duration: number;
  /**
   * Time to first step (TTFS) in milliseconds - time from start to first step execution
   */
  timeToFirstStep?: number;
  /**
   * Number of steps in the workflow
   */
  stepCount: number;
  /**
   * Array of step types in the workflow
   */
  stepTypes: string[];
  /**
   * Array of connector types used in the workflow
   */
  connectorTypes: string[];
  /**
   * Whether the workflow has scheduled triggers
   */
  hasScheduledTriggers: boolean;
  /**
   * Whether the workflow has alert triggers
   */
  hasAlertTriggers: boolean;
  /**
   * Whether the workflow has timeout configured
   */
  hasTimeout: boolean;
  /**
   * Whether the workflow has concurrency configured
   */
  hasConcurrency: boolean;
  /**
   * Whether the workflow has on-failure handlers
   */
  hasOnFailure: boolean;
  /**
   * Number of steps that were executed
   */
  executedStepCount: number;
  /**
   * Number of steps that completed successfully
   */
  successfulStepCount: number;
  /**
   * Number of steps that failed
   */
  failedStepCount: number;
  /**
   * Number of steps that were skipped
   */
  skippedStepCount: number;
  /**
   * Array of connector types that were actually used in execution
   */
  executedConnectorTypes: string[];
  /**
   * Maximum execution depth (nested scopes)
   */
  maxExecutionDepth: number;
  /**
   * Whether any steps were retried
   */
  hasRetries: boolean;
  /**
   * Whether any steps used on-failure handlers (fallback, continue)
   */
  hasErrorHandling: boolean;
  /**
   * Number of unique step IDs that were executed (accounts for loops/retries)
   */
  uniqueStepIdsExecuted: number;
  /**
   * Queue delay in milliseconds - time from when workflow was queued/scheduled to when it started executing.
   * Only present when workflow was queued due to concurrency limits or scheduling.
   */
  queueDelayMs?: number | null;
  /**
   * Time from event dispatch to workflow execution start in milliseconds.
   * Only present for event-driven executions when dispatch metadata is available.
   */
  emitToStartMs?: number;
  /**
   * Whether the workflow execution timed out
   */
  timedOut: boolean;
  /**
   * Configured timeout in milliseconds. Only present when timeout is configured.
   */
  timeoutMs?: number;
  /**
   * How much the timeout was exceeded by in milliseconds. Only present when workflow timed out.
   */
  timeoutExceededByMs?: number;
  /**
   * Array of step durations with step identification.
   * Each entry contains stepId, stepType (if available), and duration in milliseconds.
   * Only includes steps that have completed (have both startedAt and finishedAt).
   */
  stepDurations?: Array<{
    stepId: string;
    stepType?: string;
    duration: number;
  }>;
  /**
   * Average duration per step type (dictionary with sanitized step type as key).
   * Step types with dots are sanitized (dots replaced with underscores) for proper ES field indexing.
   * E.g., { "if": 100, "console": 40, "elasticsearch_search": 250 }
   */
  stepAvgDurationsByType?: Record<string, number>;
}

/**
 * Parameters for workflow execution failed event
 */
export interface WorkflowExecutionFailedParams
  extends BaseWorkflowExecutionTelemetryParams,
    OutputSizeTelemetryFields {
  eventName: string;
  /**
   * Timestamp when the execution started (ISO string)
   */
  startedAt: string;
  /**
   * Timestamp when the execution failed (ISO string)
   */
  failedAt: string;
  /**
   * Total execution duration in milliseconds before failure
   */
  duration: number;
  /**
   * Time to first step (TTFS) in milliseconds
   */
  timeToFirstStep?: number;
  /**
   * Number of steps in the workflow
   */
  stepCount: number;
  /**
   * Array of step types in the workflow
   */
  stepTypes: string[];
  /**
   * Array of connector types used in the workflow
   */
  connectorTypes: string[];
  /**
   * Whether the workflow has scheduled triggers
   */
  hasScheduledTriggers: boolean;
  /**
   * Whether the workflow has alert triggers
   */
  hasAlertTriggers: boolean;
  /**
   * Whether the workflow has timeout configured
   */
  hasTimeout: boolean;
  /**
   * Whether the workflow has concurrency configured
   */
  hasConcurrency: boolean;
  /**
   * Whether the workflow has on-failure handlers
   */
  hasOnFailure: boolean;
  /**
   * The error message
   */
  errorMessage: string;
  /**
   * The error type/category (e.g., 'ExecutionError', 'TimeoutError', 'CancellationError')
   */
  errorType: string;
  /**
   * The step ID where the error occurred (if applicable)
   */
  failedStepId?: string;
  /**
   * The step type where the error occurred (if applicable)
   */
  failedStepType?: string;
  /**
   * Number of steps that were executed before failure
   */
  executedStepCount: number;
  /**
   * Number of steps that completed successfully before failure
   */
  successfulStepCount: number;
  /**
   * Whether the error was handled by an on-failure handler
   */
  errorHandled: boolean;
  /**
   * Array of connector types that were actually used in execution
   */
  executedConnectorTypes: string[];
  /**
   * Maximum execution depth (nested scopes)
   */
  maxExecutionDepth: number;
  /**
   * Whether any steps were retried
   */
  hasRetries: boolean;
  /**
   * Whether any steps used on-failure handlers (fallback, continue)
   */
  hasErrorHandling: boolean;
  /**
   * Number of unique step IDs that were executed (accounts for loops/retries)
   */
  uniqueStepIdsExecuted: number;
  /**
   * Queue delay in milliseconds - time from when workflow was queued/scheduled to when it started executing.
   * Only present when workflow was queued due to concurrency limits or scheduling.
   */
  queueDelayMs?: number | null;
  /**
   * Time from event dispatch to workflow execution start in milliseconds.
   * Only present for event-driven executions when dispatch metadata is available.
   */
  emitToStartMs?: number;
  /**
   * Whether the workflow execution timed out
   */
  timedOut: boolean;
  /**
   * Configured timeout in milliseconds. Only present when timeout is configured.
   */
  timeoutMs?: number;
  /**
   * How much the timeout was exceeded by in milliseconds. Only present when workflow timed out.
   */
  timeoutExceededByMs?: number;
  /**
   * Array of step durations with step identification.
   * Each entry contains stepId, stepType (if available), and duration in milliseconds.
   * Only includes steps that have completed (have both startedAt and finishedAt).
   */
  stepDurations?: Array<{
    stepId: string;
    stepType?: string;
    duration: number;
  }>;
  /**
   * Average duration per step type (dictionary with sanitized step type as key).
   * Step types with dots are sanitized (dots replaced with underscores) for proper ES field indexing.
   * E.g., { "if": 100, "console": 40, "elasticsearch_search": 250 }
   */
  stepAvgDurationsByType?: Record<string, number>;
}

/**
 * Parameters for workflow execution cancelled event
 */
export interface WorkflowExecutionCancelledParams
  extends BaseWorkflowExecutionTelemetryParams,
    OutputSizeTelemetryFields {
  eventName: string;
  /**
   * Timestamp when the execution started (ISO string)
   */
  startedAt: string;
  /**
   * Timestamp when the execution was cancelled (ISO string)
   */
  cancelledAt: string;
  /**
   * Total execution duration in milliseconds before cancellation
   */
  duration: number;
  /**
   * Time to first step (TTFS) in milliseconds
   */
  timeToFirstStep?: number;
  /**
   * Number of steps in the workflow
   */
  stepCount: number;
  /**
   * Array of step types in the workflow
   */
  stepTypes: string[];
  /**
   * Array of connector types used in the workflow
   */
  connectorTypes: string[];
  /**
   * Whether the workflow has scheduled triggers
   */
  hasScheduledTriggers: boolean;
  /**
   * Whether the workflow has alert triggers
   */
  hasAlertTriggers: boolean;
  /**
   * Whether the workflow has timeout configured
   */
  hasTimeout: boolean;
  /**
   * Whether the workflow has concurrency configured
   */
  hasConcurrency: boolean;
  /**
   * Whether the workflow has on-failure handlers
   */
  hasOnFailure: boolean;
  /**
   * The cancellation reason
   */
  cancellationReason?: string;
  /**
   * Who cancelled the workflow
   */
  cancelledBy?: string;
  /**
   * Number of steps that were executed before cancellation
   */
  executedStepCount: number;
  /**
   * Number of steps that completed successfully before cancellation
   */
  successfulStepCount: number;
  /**
   * Array of connector types that were actually used in execution
   */
  executedConnectorTypes: string[];
  /**
   * Maximum execution depth (nested scopes)
   */
  maxExecutionDepth: number;
  /**
   * Whether any steps were retried
   */
  hasRetries: boolean;
  /**
   * Whether any steps used on-failure handlers (fallback, continue)
   */
  hasErrorHandling: boolean;
  /**
   * Number of unique step IDs that were executed (accounts for loops/retries)
   */
  uniqueStepIdsExecuted: number;
  /**
   * Queue delay in milliseconds - time from when workflow was queued/scheduled to when it started executing.
   * Only present when workflow was queued due to concurrency limits or scheduling.
   */
  queueDelayMs?: number | null;
  /**
   * Time from event dispatch to workflow execution start in milliseconds.
   * Only present for event-driven executions when dispatch metadata is available.
   */
  emitToStartMs?: number;
  /**
   * Whether the workflow execution timed out
   */
  timedOut: boolean;
  /**
   * Configured timeout in milliseconds. Only present when timeout is configured.
   */
  timeoutMs?: number;
  /**
   * How much the timeout was exceeded by in milliseconds. Only present when workflow timed out.
   */
  timeoutExceededByMs?: number;
  /**
   * Array of step durations with step identification.
   * Each entry contains stepId, stepType (if available), and duration in milliseconds.
   * Only includes steps that have completed (have both startedAt and finishedAt).
   */
  stepDurations?: Array<{
    stepId: string;
    stepType?: string;
    duration: number;
  }>;
  /**
   * Average duration per step type (dictionary with sanitized step type as key).
   * Step types with dots are sanitized (dots replaced with underscores) for proper ES field indexing.
   * E.g., { "if": 100, "console": 40, "elasticsearch_search": 250 }
   */
  stepAvgDurationsByType?: Record<string, number>;
}

/**
 * Telemetry event dispatched when emitEvent is called and trigger subscriptions are resolved.
 */
export interface TriggerEventDispatchedParams {
  eventName: string;
  triggerId: string;
  executionEnabled: boolean;
  logEventsEnabled: boolean;
  eventChainDepth: number;
  eventId: string;
  sourceExecutionId?: string;
  auditOnly: boolean;
  subscriberResolutionMs?: number;
  subscribedCount: number;
  disabledCount: number;
  kqlFalseCount: number;
  kqlErrorCount: number;
  matchedCount: number;
  depthSkippedCount: number;
  workflowEventsIgnoreSkippedCount: number;
  workflowEventsCycleSkippedCount: number;
  scheduledAttemptCount: number;
  scheduledSuccessCount: number;
  scheduledFailureCount: number;
}

/**
 * Union type of all workflow execution telemetry event parameters
 */
export type WorkflowExecutionTelemetryEventParams =
  | WorkflowExecutionCompletedParams
  | WorkflowExecutionFailedParams
  | WorkflowExecutionCancelledParams
  | EventDrivenExecutionSuppressedParams
  | TriggerEventDispatchedParams;

/**
 * Maps each workflow execution event type to its corresponding params type.
 * Used to provide type-safe event reporting without needing schemas at call sites.
 */
export interface WorkflowExecutionTelemetryEventsMap {
  [WorkflowExecutionTelemetryEventTypes.WorkflowExecutionCompleted]: WorkflowExecutionCompletedParams;
  [WorkflowExecutionTelemetryEventTypes.WorkflowExecutionFailed]: WorkflowExecutionFailedParams;
  [WorkflowExecutionTelemetryEventTypes.WorkflowExecutionCancelled]: WorkflowExecutionCancelledParams;
  [WorkflowExecutionTelemetryEventTypes.EventDrivenExecutionSuppressed]: EventDrivenExecutionSuppressedParams;
  [WorkflowExecutionTelemetryEventTypes.TriggerEventDispatched]: TriggerEventDispatchedParams;
}
