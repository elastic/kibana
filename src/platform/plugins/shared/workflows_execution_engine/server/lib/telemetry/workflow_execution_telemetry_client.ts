/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AnalyticsServiceSetup, EventTypeOpts, Logger } from '@kbn/core/server';
import type { EsWorkflowExecution, EsWorkflowStepExecution } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowYaml } from '@kbn/workflows/spec/schema';
import { workflowExecutionEventNames } from './events/workflows_execution';
import {
  type WorkflowExecutionCancelledParams,
  type WorkflowExecutionCompletedParams,
  type WorkflowExecutionFailedParams,
  WorkflowExecutionTelemetryEventTypes,
} from './events/workflows_execution/types';
import { extractAlertRuleId, extractExecutionMetadata } from './utils/extract_execution_metadata';
import { extractWorkflowMetadata } from './utils/extract_workflow_metadata';
import { parseDuration } from '../../utils';

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
 * Base telemetry client for workflow execution engine.
 * Provides common functionality for reporting telemetry events.
 */
export class WorkflowExecutionTelemetryClient {
  constructor(
    protected readonly telemetry: AnalyticsServiceSetup,
    protected readonly logger: Logger
  ) {}

  /**
   * Reports a telemetry event with error handling.
   */
  protected reportEvent<T extends object>(eventTypeOpts: EventTypeOpts<T>, data: T): void {
    try {
      this.telemetry.reportEvent(eventTypeOpts.eventType, data);
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      this.logger.error(`Error reporting event ${eventTypeOpts.eventType}: ${error.message}`);
    }
  }

  /**
   * Reports when a workflow execution completes successfully.
   * Note: We only report completion/failure/cancellation events (not started) to reduce telemetry load.
   */
  reportWorkflowExecutionCompleted(params: {
    workflowExecution: EsWorkflowExecution;
    stepExecutions: EsWorkflowStepExecution[];
    timeToFirstStep?: number;
    queueMetrics?: { queueDelayMs?: number | null };
  }): void {
    const { workflowExecution, stepExecutions, timeToFirstStep, queueMetrics } = params;
    const workflowMetadata = extractWorkflowMetadata(workflowExecution.workflowDefinition);
    const executionMetadata = extractExecutionMetadata(workflowExecution, stepExecutions);
    const ruleId = extractAlertRuleId(workflowExecution);
    const timeoutInfo = extractTimeoutInfo(workflowExecution, workflowExecution.workflowDefinition);

    const completedAt = workflowExecution.finishedAt || new Date().toISOString();
    const startedAt = new Date(workflowExecution.createdAt);
    const duration = new Date(completedAt).getTime() - startedAt.getTime();

    const eventData: WorkflowExecutionCompletedParams = {
      eventName:
        workflowExecutionEventNames[
          WorkflowExecutionTelemetryEventTypes.WorkflowExecutionCompleted
        ],
      workflowExecutionId: workflowExecution.id,
      workflowId: workflowExecution.workflowId,
      spaceId: workflowExecution.spaceId,
      triggerType: (workflowExecution.triggeredBy as 'manual' | 'scheduled' | 'alert') || 'manual',
      isTestRun: workflowExecution.isTestRun || false,
      ...(ruleId && { ruleId }),
      startedAt: workflowExecution.createdAt,
      completedAt,
      duration,
      ...(timeToFirstStep !== undefined && { timeToFirstStep }),
      stepCount: workflowMetadata.stepCount,
      stepTypes: Object.keys(workflowMetadata.stepTypeCounts),
      connectorTypes: workflowMetadata.connectorTypes,
      hasScheduledTriggers: workflowMetadata.hasScheduledTriggers,
      hasAlertTriggers: workflowMetadata.hasAlertTriggers,
      hasTimeout: workflowMetadata.hasTimeout,
      hasConcurrency: workflowMetadata.hasConcurrency,
      hasOnFailure: workflowMetadata.hasOnFailure,
      executedStepCount: executionMetadata.executedStepCount,
      successfulStepCount: executionMetadata.successfulStepCount,
      failedStepCount: executionMetadata.failedStepCount,
      skippedStepCount: executionMetadata.skippedStepCount,
      executedStepTypes: executionMetadata.executedStepTypes,
      executedConnectorTypes: executionMetadata.executedConnectorTypes,
      maxExecutionDepth: executionMetadata.maxExecutionDepth,
      hasRetries: executionMetadata.hasRetries,
      hasErrorHandling: executionMetadata.hasErrorHandling,
      uniqueStepIdsExecuted: executionMetadata.uniqueStepIdsExecuted,
      ...(queueMetrics?.queueDelayMs !== null &&
        queueMetrics?.queueDelayMs !== undefined && {
          queueDelayMs: queueMetrics.queueDelayMs,
        }),
      timedOut: timeoutInfo.timedOut,
      ...(timeoutInfo.timeoutMs !== undefined && { timeoutMs: timeoutInfo.timeoutMs }),
      ...(timeoutInfo.timeoutExceededByMs !== undefined && {
        timeoutExceededByMs: timeoutInfo.timeoutExceededByMs,
      }),
    };

    this.reportEvent(
      {
        eventType: WorkflowExecutionTelemetryEventTypes.WorkflowExecutionCompleted,
        schema: {} as EventTypeOpts<WorkflowExecutionCompletedParams>['schema'],
      },
      eventData
    );
  }

  /**
   * Reports when a workflow execution fails.
   */
  reportWorkflowExecutionFailed(params: {
    workflowExecution: EsWorkflowExecution;
    stepExecutions: EsWorkflowStepExecution[];
    timeToFirstStep?: number;
    queueMetrics?: { queueDelayMs?: number | null };
  }): void {
    const { workflowExecution, stepExecutions, timeToFirstStep, queueMetrics } = params;
    const workflowMetadata = extractWorkflowMetadata(workflowExecution.workflowDefinition);
    const executionMetadata = extractExecutionMetadata(workflowExecution, stepExecutions);
    const ruleId = extractAlertRuleId(workflowExecution);
    const timeoutInfo = extractTimeoutInfo(workflowExecution, workflowExecution.workflowDefinition);

    const failedAt = workflowExecution.finishedAt || new Date().toISOString();
    const startedAt = new Date(workflowExecution.createdAt);
    const duration = new Date(failedAt).getTime() - startedAt.getTime();

    // Find the failed step
    const failedStep = stepExecutions.find((step) => step.status === 'failed');

    const errorMessage = workflowExecution.error?.message || 'Unknown error';
    const errorType = workflowExecution.error?.type || 'ExecutionError';

    // Check if error was handled by on-failure handler
    // This is a heuristic: if we have a failed step but workflow didn't fail immediately,
    // it have been handled
    const errorHandled = failedStep !== undefined && workflowExecution.status === 'failed';

    const eventData: WorkflowExecutionFailedParams = {
      eventName:
        workflowExecutionEventNames[WorkflowExecutionTelemetryEventTypes.WorkflowExecutionFailed],
      workflowExecutionId: workflowExecution.id,
      workflowId: workflowExecution.workflowId,
      spaceId: workflowExecution.spaceId,
      triggerType: (workflowExecution.triggeredBy as 'manual' | 'scheduled' | 'alert') || 'manual',
      isTestRun: workflowExecution.isTestRun || false,
      ...(ruleId && { ruleId }),
      startedAt: workflowExecution.createdAt,
      failedAt,
      duration,
      ...(timeToFirstStep !== undefined && { timeToFirstStep }),
      stepCount: workflowMetadata.stepCount,
      stepTypes: Object.keys(workflowMetadata.stepTypeCounts),
      connectorTypes: workflowMetadata.connectorTypes,
      hasScheduledTriggers: workflowMetadata.hasScheduledTriggers,
      hasAlertTriggers: workflowMetadata.hasAlertTriggers,
      hasTimeout: workflowMetadata.hasTimeout,
      hasConcurrency: workflowMetadata.hasConcurrency,
      hasOnFailure: workflowMetadata.hasOnFailure,
      errorMessage,
      errorType,
      ...(failedStep && { failedStepId: failedStep.stepId }),
      ...(failedStep?.stepType && { failedStepType: failedStep.stepType }),
      executedStepCount: executionMetadata.executedStepCount,
      successfulStepCount: executionMetadata.successfulStepCount,
      executedStepTypes: executionMetadata.executedStepTypes,
      executedConnectorTypes: executionMetadata.executedConnectorTypes,
      maxExecutionDepth: executionMetadata.maxExecutionDepth,
      hasRetries: executionMetadata.hasRetries,
      hasErrorHandling: executionMetadata.hasErrorHandling,
      uniqueStepIdsExecuted: executionMetadata.uniqueStepIdsExecuted,
      errorHandled,
      ...(queueMetrics?.queueDelayMs !== null &&
        queueMetrics?.queueDelayMs !== undefined && {
          queueDelayMs: queueMetrics.queueDelayMs,
        }),
      timedOut: timeoutInfo.timedOut,
      ...(timeoutInfo.timeoutMs !== undefined && { timeoutMs: timeoutInfo.timeoutMs }),
      ...(timeoutInfo.timeoutExceededByMs !== undefined && {
        timeoutExceededByMs: timeoutInfo.timeoutExceededByMs,
      }),
    };

    this.reportEvent(
      {
        eventType: WorkflowExecutionTelemetryEventTypes.WorkflowExecutionFailed,
        schema: {} as EventTypeOpts<WorkflowExecutionFailedParams>['schema'],
      },
      eventData
    );
  }

  /**
   * Reports when a workflow execution is cancelled.
   */
  reportWorkflowExecutionCancelled(params: {
    workflowExecution: EsWorkflowExecution;
    stepExecutions: EsWorkflowStepExecution[];
    timeToFirstStep?: number;
    queueMetrics?: { queueDelayMs?: number | null };
  }): void {
    const { workflowExecution, stepExecutions, timeToFirstStep, queueMetrics } = params;
    const workflowMetadata = extractWorkflowMetadata(workflowExecution.workflowDefinition);
    const executionMetadata = extractExecutionMetadata(workflowExecution, stepExecutions);
    const ruleId = extractAlertRuleId(workflowExecution);
    const timeoutInfo = extractTimeoutInfo(workflowExecution, workflowExecution.workflowDefinition);

    const cancelledAt = workflowExecution.cancelledAt || new Date().toISOString();
    const startedAt = new Date(workflowExecution.createdAt);
    const duration = new Date(cancelledAt).getTime() - startedAt.getTime();

    const eventData: WorkflowExecutionCancelledParams = {
      eventName:
        workflowExecutionEventNames[
          WorkflowExecutionTelemetryEventTypes.WorkflowExecutionCancelled
        ],
      workflowExecutionId: workflowExecution.id,
      workflowId: workflowExecution.workflowId,
      spaceId: workflowExecution.spaceId,
      triggerType: (workflowExecution.triggeredBy as 'manual' | 'scheduled' | 'alert') || 'manual',
      isTestRun: workflowExecution.isTestRun || false,
      ...(ruleId && { ruleId }),
      startedAt: workflowExecution.createdAt,
      cancelledAt,
      duration,
      ...(timeToFirstStep !== undefined && { timeToFirstStep }),
      stepCount: workflowMetadata.stepCount,
      stepTypes: Object.keys(workflowMetadata.stepTypeCounts),
      connectorTypes: workflowMetadata.connectorTypes,
      hasScheduledTriggers: workflowMetadata.hasScheduledTriggers,
      hasAlertTriggers: workflowMetadata.hasAlertTriggers,
      hasTimeout: workflowMetadata.hasTimeout,
      hasConcurrency: workflowMetadata.hasConcurrency,
      hasOnFailure: workflowMetadata.hasOnFailure,
      ...(workflowExecution.cancellationReason && {
        cancellationReason: workflowExecution.cancellationReason,
      }),
      executedStepCount: executionMetadata.executedStepCount,
      successfulStepCount: executionMetadata.successfulStepCount,
      executedStepTypes: executionMetadata.executedStepTypes,
      executedConnectorTypes: executionMetadata.executedConnectorTypes,
      maxExecutionDepth: executionMetadata.maxExecutionDepth,
      hasRetries: executionMetadata.hasRetries,
      hasErrorHandling: executionMetadata.hasErrorHandling,
      uniqueStepIdsExecuted: executionMetadata.uniqueStepIdsExecuted,
      ...(queueMetrics?.queueDelayMs !== null &&
        queueMetrics?.queueDelayMs !== undefined && {
          queueDelayMs: queueMetrics.queueDelayMs,
        }),
      timedOut: timeoutInfo.timedOut,
      ...(timeoutInfo.timeoutMs !== undefined && { timeoutMs: timeoutInfo.timeoutMs }),
      ...(timeoutInfo.timeoutExceededByMs !== undefined && {
        timeoutExceededByMs: timeoutInfo.timeoutExceededByMs,
      }),
    };

    this.reportEvent(
      {
        eventType: WorkflowExecutionTelemetryEventTypes.WorkflowExecutionCancelled,
        schema: {} as EventTypeOpts<WorkflowExecutionCancelledParams>['schema'],
      },
      eventData
    );
  }
}
