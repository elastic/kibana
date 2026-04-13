/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import type {
  EsWorkflowExecution,
  EsWorkflowStepExecution,
  WorkflowExecutionEventDispatchMetadata,
} from '@kbn/workflows';
import type { WorkflowYaml } from '@kbn/workflows/spec/schema';
import { parseDuration } from '../../../utils';

/**
 * Metadata extracted from a workflow execution for telemetry purposes
 */
export interface WorkflowExecutionTelemetryMetadata {
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
   * Alert rule ID if triggered by alert
   */
  ruleId?: string;
  /**
   * Time to first step in milliseconds
   */
  timeToFirstStep?: number;
  /**
   * Queue delay in milliseconds
   */
  queueDelayMs?: number;
  /**
   * Time in milliseconds from emitEvent dispatch to workflow execution start.
   * Present for event-driven executions when dispatch timestamp metadata is available.
   */
  emitToStartMs?: number;
  /**
   * Whether the workflow execution timed out
   */
  timedOut: boolean;
  /**
   * Configured timeout in milliseconds
   */
  timeoutMs?: number;
  /**
   * How much the timeout was exceeded by in milliseconds
   */
  timeoutExceededByMs?: number;
  /**
   * Array of step durations with step identification
   * Each entry contains stepId, stepType, and duration in milliseconds
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
  /**
   * Cross-workflow nesting depth for sub-workflow executions (1 = direct child).
   * Only present when triggered by a parent workflow step.
   */
  compositionDepth?: number;
  /**
   * The workflow ID of the parent that invoked this sub-workflow.
   * Only present for sub-workflow executions when available in context.
   */
  parentWorkflowId?: string;
  /**
   * Whether the parent invoked this sub-workflow via workflow.execute (sync) or workflow.executeAsync.
   * Only present for sub-workflow executions when set on the execution context.
   */
  parentWorkflowInvocation?: 'sync' | 'async';
  /**
   * Event-chain depth when this run was scheduled by the event-driven trigger handler.
   * Distinct from `compositionDepth` (sub-workflow nesting). Omitted when not an event-chain execution.
   */
  eventChainDepth?: number;
}

/**
 * Extracts timeout information from workflow execution.
 * Returns timeout configuration and whether the workflow timed out.
 *
 * @param workflowExecution - The workflow execution
 * @param workflowDefinition - The workflow definition
 * @returns Object with timedOut flag, timeoutMs, and timeoutExceededByMs
 */
function extractTimeoutInfo(
  workflowExecution: EsWorkflowExecution,
  workflowDefinition: WorkflowYaml
): {
  timedOut: boolean;
  timeoutMs?: number;
  timeoutExceededByMs?: number;
} {
  const timedOut = workflowExecution.status === ExecutionStatus.TIMED_OUT;

  // Extract timeout from workflow settings
  const timeoutDuration = workflowDefinition.settings?.timeout;
  let timeoutMs: number | undefined;
  if (timeoutDuration && typeof timeoutDuration === 'string') {
    try {
      timeoutMs = parseDuration(timeoutDuration);
    } catch {
      // Invalid timeout format, ignore
    }
  }

  // Calculate how much timeout was exceeded (only if timed out and timeout is configured)
  let timeoutExceededByMs: number | undefined;
  if (timedOut && timeoutMs !== undefined) {
    const startedAt = new Date(workflowExecution.startedAt).getTime();
    const finishedAt = workflowExecution.finishedAt
      ? new Date(workflowExecution.finishedAt).getTime()
      : Date.now();
    const actualDuration = finishedAt - startedAt;
    timeoutExceededByMs = Math.max(0, actualDuration - timeoutMs);
  }

  return {
    timedOut,
    ...(timeoutMs !== undefined && { timeoutMs }),
    ...(timeoutExceededByMs !== undefined && { timeoutExceededByMs }),
  };
}

/**
 * Extracts telemetry metadata from a workflow execution and its step executions.
 * This includes execution statistics, alert rule ID, queue delay, time to first step, and timeout information.
 *
 * @param workflowExecution - The workflow execution
 * @param stepExecutions - Array of step executions for this workflow execution
 * @returns Metadata object with extracted execution information
 */
export function extractExecutionMetadata(
  workflowExecution: EsWorkflowExecution,
  stepExecutions: EsWorkflowStepExecution[]
): WorkflowExecutionTelemetryMetadata {
  const executedStepCount = stepExecutions.length;
  const successfulStepCount = stepExecutions.filter((step) => step.status === 'completed').length;
  const failedStepCount = stepExecutions.filter((step) => step.status === 'failed').length;
  const skippedStepCount = stepExecutions.filter((step) => step.status === 'skipped').length;

  // Extract connector types from executed steps
  const executedConnectorTypesSet = new Set<string>();
  const uniqueStepIdsSet = new Set<string>();

  for (const stepExecution of stepExecutions) {
    if (stepExecution.stepType) {
      // Extract connector type if it's a connector step (step type contains a dot)
      if (stepExecution.stepType.includes('.')) {
        const connectorName = stepExecution.stepType.split('.')[0];
        executedConnectorTypesSet.add(connectorName);
      }
    }
    uniqueStepIdsSet.add(stepExecution.stepId);
  }

  // Calculate max execution depth from scope stack
  const maxExecutionDepth = stepExecutions.reduce((maxDepth, stepExecution) => {
    const depth = stepExecution.scopeStack?.length || 0;
    return Math.max(maxDepth, depth);
  }, 0);

  // Check for retries - if a step ID appears multiple times, it was likely retried
  const stepIdCounts = new Map<string, number>();
  for (const stepExecution of stepExecutions) {
    const count = stepIdCounts.get(stepExecution.stepId) || 0;
    stepIdCounts.set(stepExecution.stepId, count + 1);
  }
  const hasRetries = Array.from(stepIdCounts.values()).some((count) => count > 1);

  // Check for error handling - if a step failed but workflow continued, error was handled
  const hasErrorHandling =
    failedStepCount > 0 &&
    workflowExecution.status !== 'failed' &&
    workflowExecution.status !== 'cancelled';

  // Extract alert rule ID
  const ruleId = extractAlertRuleId(workflowExecution);

  const compositionContext = extractCompositionContext(workflowExecution);
  const eventChainDepth = extractEventChainDepthFromExecution(workflowExecution);

  // Extract or calculate queue delay
  const queueDelayMs = extractQueueDelayMs(workflowExecution);

  // Calculate emit-to-start delay for event-driven executions, when dispatch metadata is available.
  const emitToStartMs = extractEmitToStartMs(workflowExecution);

  // Calculate time to first step
  const timeToFirstStep = extractTimeToFirstStep(workflowExecution, stepExecutions);

  // Extract timeout information
  const timeoutInfo = extractTimeoutInfo(workflowExecution, workflowExecution.workflowDefinition);

  // Extract step durations
  const stepDurations = extractStepDurations(stepExecutions);

  // Extract average duration per step type
  const stepAvgDurationsByType = extractStepAvgDurationsByType(stepExecutions);

  return {
    executedStepCount,
    successfulStepCount,
    failedStepCount,
    skippedStepCount,
    executedConnectorTypes: Array.from(executedConnectorTypesSet),
    maxExecutionDepth,
    hasRetries,
    hasErrorHandling,
    uniqueStepIdsExecuted: uniqueStepIdsSet.size,
    ...(ruleId && { ruleId }),
    ...compositionContext,
    ...(eventChainDepth !== undefined && { eventChainDepth }),
    ...(timeToFirstStep !== undefined && { timeToFirstStep }),
    ...(queueDelayMs !== undefined && { queueDelayMs }),
    ...(emitToStartMs !== undefined && { emitToStartMs }),
    timedOut: timeoutInfo.timedOut,
    ...(timeoutInfo.timeoutMs !== undefined && { timeoutMs: timeoutInfo.timeoutMs }),
    ...(timeoutInfo.timeoutExceededByMs !== undefined && {
      timeoutExceededByMs: timeoutInfo.timeoutExceededByMs,
    }),
    ...(stepDurations.length > 0 && { stepDurations }),
    ...(Object.keys(stepAvgDurationsByType).length > 0 && { stepAvgDurationsByType }),
  };
}

function isPlainScheduleMetadataSource(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Resolves schedule/dispatch metadata using the same precedence as buildWorkflowContext:
 * top-level `workflowExecution.metadata` first, then `workflowExecution.context.metadata`.
 */
function pickScheduleDispatchTimestamp(
  top: Record<string, unknown> | undefined,
  nested: Record<string, unknown> | undefined
): string | number | undefined {
  const fromTop = top?.eventDispatchTimestamp;
  if (typeof fromTop === 'string' || typeof fromTop === 'number') {
    return fromTop;
  }
  const fromNested = nested?.eventDispatchTimestamp;
  if (typeof fromNested === 'string' || typeof fromNested === 'number') {
    return fromNested;
  }
  return undefined;
}

function pickScheduleEventTriggerId(
  top: Record<string, unknown> | undefined,
  nested: Record<string, unknown> | undefined
): string | undefined {
  if (typeof top?.eventTriggerId === 'string') {
    return top.eventTriggerId;
  }
  if (typeof nested?.eventTriggerId === 'string') {
    return nested.eventTriggerId;
  }
  return undefined;
}

function resolveWorkflowExecutionScheduleMetadata(
  workflowExecution: EsWorkflowExecution
): WorkflowExecutionEventDispatchMetadata {
  const top = isPlainScheduleMetadataSource(workflowExecution.metadata)
    ? workflowExecution.metadata
    : undefined;
  const nested = isPlainScheduleMetadataSource(workflowExecution.context?.metadata)
    ? workflowExecution.context.metadata
    : undefined;

  const eventDispatchTimestamp = pickScheduleDispatchTimestamp(top, nested);
  const eventTriggerId = pickScheduleEventTriggerId(top, nested);

  return {
    ...(eventDispatchTimestamp !== undefined ? { eventDispatchTimestamp } : {}),
    ...(eventTriggerId !== undefined ? { eventTriggerId } : {}),
  };
}

function extractEmitToStartMs(workflowExecution: EsWorkflowExecution): number | undefined {
  const startedAtMs = Date.parse(workflowExecution.startedAt);
  if (Number.isNaN(startedAtMs)) {
    return undefined;
  }

  const scheduleMeta = resolveWorkflowExecutionScheduleMetadata(workflowExecution);
  const dispatchTimestamp = scheduleMeta.eventDispatchTimestamp;

  const dispatchMs =
    typeof dispatchTimestamp === 'string'
      ? Date.parse(dispatchTimestamp)
      : typeof dispatchTimestamp === 'number'
      ? dispatchTimestamp
      : Number.NaN;

  if (Number.isNaN(dispatchMs)) {
    return undefined;
  }

  const delayMs = startedAtMs - dispatchMs;
  return delayMs >= 0 ? delayMs : undefined;
}

/** How the parent started this sub-workflow (persisted on child execution context by execute strategies). */
type ParentWorkflowInvocationMode = 'sync' | 'async';

/**
 * Reads event-chain depth from execution context (set when scheduled via the event-driven trigger handler).
 * Same source as `run_workflow` uses for `setWorkflowEventChainContext`.
 */
export function extractEventChainDepthFromExecution(
  workflowExecution: EsWorkflowExecution
): number | undefined {
  const context = workflowExecution.context;
  if (context == null || typeof context !== 'object' || Array.isArray(context)) {
    return undefined;
  }
  const event = (context as Record<string, unknown>).event;
  if (event == null || typeof event !== 'object' || Array.isArray(event)) {
    return undefined;
  }
  const depth = (event as Record<string, unknown>).eventChainDepth;
  return typeof depth === 'number' && depth >= 0 ? depth : undefined;
}

/**
 * Extracts composition context for sub-workflow executions (triggered by workflow.execute / workflow.executeAsync).
 * Returns empty object for top-level executions.
 *
 * @param workflowExecution - The workflow execution
 * @returns compositionDepth and optional parentWorkflowId / parentWorkflowInvocation when this is a child execution
 */
export function extractCompositionContext(workflowExecution: EsWorkflowExecution): {
  compositionDepth?: number;
  parentWorkflowId?: string;
  parentWorkflowInvocation?: ParentWorkflowInvocationMode;
} {
  if (workflowExecution.triggeredBy !== 'workflow-step') {
    return {};
  }

  const context = (workflowExecution.context || {}) as Record<string, unknown>;
  const parentDepth = context.parentDepth;
  const compositionDepth = typeof parentDepth === 'number' ? parentDepth + 1 : 1;
  const parentWorkflowId =
    typeof context.parentWorkflowId === 'string' ? context.parentWorkflowId : undefined;
  const parentWorkflowInvocation =
    (context.parentWorkflowInvocation as ParentWorkflowInvocationMode) || undefined;

  return {
    compositionDepth,
    ...(parentWorkflowId && { parentWorkflowId }),
    ...(parentWorkflowInvocation && { parentWorkflowInvocation }),
  };
}

/**
 * Extracts the alert rule ID from workflow execution context.
 * Returns undefined if not triggered by alert or rule ID not available.
 *
 * @param workflowExecution - The workflow execution
 * @returns The alert rule ID if available, undefined otherwise
 */
export function extractAlertRuleId(workflowExecution: EsWorkflowExecution): string | undefined {
  if (workflowExecution.triggeredBy !== 'alert') {
    return undefined;
  }

  // Try to extract from context.event.rule.id
  const context = workflowExecution.context || {};
  const event = context.event as { rule?: { id?: string }; type?: string } | undefined;

  if (event?.type === 'alert' && event?.rule?.id) {
    return event.rule.id;
  }

  return undefined;
}

/**
 * Calculates the time to first step (TTFS) in milliseconds.
 * This is the time from when the workflow execution started to when the first step execution started.
 *
 * @param workflowExecution - The workflow execution
 * @param stepExecutions - Array of step executions for this workflow execution
 * @returns Time to first step in milliseconds, or undefined if no steps were executed or timestamps are missing
 */
export function extractTimeToFirstStep(
  workflowExecution: EsWorkflowExecution,
  stepExecutions: EsWorkflowStepExecution[]
): number | undefined {
  if (stepExecutions.length === 0 || !workflowExecution.startedAt) {
    return undefined;
  }

  // Find the step with the earliest startedAt timestamp
  const firstStep = stepExecutions.reduce((earliest, step) => {
    if (!earliest.startedAt) return step;
    if (!step.startedAt) return earliest;
    return new Date(step.startedAt) < new Date(earliest.startedAt) ? step : earliest;
  });

  if (!firstStep.startedAt) {
    return undefined;
  }

  return new Date(firstStep.startedAt).getTime() - new Date(workflowExecution.startedAt).getTime();
}

/**
 * Extracts or calculates queue delay in milliseconds from workflow execution.
 * Queue delay is the time from when a workflow was scheduled/queued to when it started executing.
 *
 * Priority:
 * 1. Use queueMetrics.queueDelayMs if available (most accurate, includes concurrency queue delays)
 * 2. For scheduled workflows, calculate from taskRunAt and startedAt if available
 * 3. Return undefined if insufficient data
 *
 * @param workflowExecution - The workflow execution
 * @returns Queue delay in milliseconds, or undefined if not available or not applicable
 */
export function extractQueueDelayMs(workflowExecution: EsWorkflowExecution): number | undefined {
  // First, try to use queueMetrics if available (most accurate)
  if (
    workflowExecution.queueMetrics?.queueDelayMs !== null &&
    workflowExecution.queueMetrics?.queueDelayMs !== undefined
  ) {
    return workflowExecution.queueMetrics.queueDelayMs;
  }

  // For scheduled workflows, try to calculate from taskRunAt and startedAt
  // taskRunAt represents when the task was scheduled to run
  // startedAt represents when the workflow actually started executing
  if (
    workflowExecution.triggeredBy === 'scheduled' &&
    workflowExecution.taskRunAt &&
    workflowExecution.startedAt
  ) {
    try {
      const taskRunAtTime = new Date(workflowExecution.taskRunAt).getTime();
      const startedAtTime = new Date(workflowExecution.startedAt).getTime();

      // Only return positive values (queue delay should be positive)
      const queueDelay = startedAtTime - taskRunAtTime;
      if (queueDelay >= 0) {
        return queueDelay;
      }
    } catch (e) {
      // Invalid date strings, return undefined
      return undefined;
    }
  }

  return undefined;
}

/**
 * Extracts step durations from step executions.
 * Only includes steps that have executionTimeMs set.
 *
 * @param stepExecutions - Array of step executions
 * @returns Array of step durations with step identification
 */
function extractStepDurations(stepExecutions: EsWorkflowStepExecution[]): Array<{
  stepId: string;
  stepType?: string;
  duration: number;
}> {
  const durations: Array<{
    stepId: string;
    stepType?: string;
    duration: number;
  }> = [];

  for (const stepExecution of stepExecutions) {
    // Only include steps that have valid executionTimeMs
    if (
      stepExecution.executionTimeMs !== undefined &&
      stepExecution.executionTimeMs !== null &&
      stepExecution.executionTimeMs >= 0
    ) {
      durations.push({
        stepId: stepExecution.stepId,
        ...(stepExecution.stepType && { stepType: stepExecution.stepType }),
        duration: stepExecution.executionTimeMs,
      });
    }
  }

  return durations;
}

/**
 * Sanitizes a step type name for use as an Elasticsearch field name.
 * Replaces dots with underscores to avoid nested field path issues.
 *
 * @param stepType - The original step type (e.g., "elasticsearch.search")
 * @returns Sanitized step type (e.g., "elasticsearch_search")
 */
function sanitizeStepType(stepType: string): string {
  return stepType.replace(/\./g, '_');
}

/**
 * Extracts average duration per step type from step executions.
 * Groups durations by step type and calculates the average for each type.
 * Step types are sanitized (dots replaced with underscores) for proper ES field indexing.
 *
 * @param stepExecutions - Array of step executions
 * @returns Dictionary with sanitized step type as key and average duration as value
 */
function extractStepAvgDurationsByType(
  stepExecutions: EsWorkflowStepExecution[]
): Record<string, number> {
  // Group durations by step type
  const durationsByType = new Map<string, number[]>();

  for (const stepExecution of stepExecutions) {
    if (
      stepExecution.stepType &&
      stepExecution.executionTimeMs !== undefined &&
      stepExecution.executionTimeMs !== null &&
      stepExecution.executionTimeMs >= 0
    ) {
      const sanitizedType = sanitizeStepType(stepExecution.stepType);
      const durations = durationsByType.get(sanitizedType) || [];
      durations.push(stepExecution.executionTimeMs);
      durationsByType.set(sanitizedType, durations);
    }
  }

  // Calculate average for each step type
  const avgDurationsByType: Record<string, number> = {};
  for (const [stepType, durations] of durationsByType) {
    const sum = durations.reduce((acc, d) => acc + d, 0);
    avgDurationsByType[stepType] = Math.round(sum / durations.length);
  }

  return avgDurationsByType;
}
