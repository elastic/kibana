/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import type { EsWorkflowExecution, EsWorkflowStepExecution } from '@kbn/workflows';
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

  // Extract or calculate queue delay
  const queueDelayMs = extractQueueDelayMs(workflowExecution);

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
    ...(timeToFirstStep !== undefined && { timeToFirstStep }),
    ...(queueDelayMs !== undefined && { queueDelayMs }),
    timedOut: timeoutInfo.timedOut,
    ...(timeoutInfo.timeoutMs !== undefined && { timeoutMs: timeoutInfo.timeoutMs }),
    ...(timeoutInfo.timeoutExceededByMs !== undefined && {
      timeoutExceededByMs: timeoutInfo.timeoutExceededByMs,
    }),
    ...(stepDurations.length > 0 && { stepDurations }),
    ...(Object.keys(stepAvgDurationsByType).length > 0 && { stepAvgDurationsByType }),
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
