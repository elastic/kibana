/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AnalyticsServiceSetup, AnalyticsServiceStart, Logger } from '@kbn/core/server';
import type { EsWorkflowExecution, EsWorkflowStepExecution } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import {
  workflowExecutionEventNames,
  workflowExecutionEventSchemas,
} from './events/workflows_execution';
import {
  type WorkflowExecutionCancelledParams,
  type WorkflowExecutionCompletedParams,
  type WorkflowExecutionFailedParams,
  type WorkflowExecutionTelemetryEventsMap,
  WorkflowExecutionTelemetryEventTypes,
} from './events/workflows_execution/types';
import { extractExecutionMetadata } from './utils/extract_execution_metadata';
import { extractWorkflowMetadata } from './utils/extract_workflow_metadata';

/**
 * Base telemetry client for workflow execution engine.
 * Provides common functionality for reporting telemetry events.
 */
export class WorkflowExecutionTelemetryClient {
  /**
   * Registers telemetry event schemas during plugin setup.
   * This should be called once during the plugin's setup phase.
   */
  static setup(analytics: AnalyticsServiceSetup): void {
    for (const [eventType, schema] of Object.entries(workflowExecutionEventSchemas)) {
      analytics.registerEventType({
        eventType,
        schema: schema as Parameters<typeof analytics.registerEventType>[0]['schema'],
      });
    }
  }

  constructor(
    protected readonly telemetry: AnalyticsServiceStart,
    protected readonly logger: Logger
  ) {}

  /**
   * Reports a telemetry event with error handling.
   */
  protected reportEvent<T extends WorkflowExecutionTelemetryEventTypes>(
    eventType: T,
    data: WorkflowExecutionTelemetryEventsMap[T]
  ): void {
    try {
      this.telemetry.reportEvent(eventType, data);
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      this.logger.error(`Error reporting event ${eventType}: ${error.message}`);
    }
  }

  /**
   * Reports a workflow execution termination event.
   * This is a centralized method that routes to the appropriate specific event based on the final status.
   *
   * @param params - Parameters containing workflow execution, step executions, and final status
   */
  reportWorkflowExecutionTerminated(params: {
    workflowExecution: EsWorkflowExecution;
    stepExecutions: EsWorkflowStepExecution[];
    finalStatus: ExecutionStatus;
  }): void {
    const { workflowExecution, stepExecutions, finalStatus } = params;

    if (finalStatus === ExecutionStatus.COMPLETED) {
      this.reportWorkflowExecutionCompleted({
        workflowExecution,
        stepExecutions,
      });
    } else if (
      finalStatus === ExecutionStatus.FAILED ||
      finalStatus === ExecutionStatus.TIMED_OUT
    ) {
      this.reportWorkflowExecutionFailed({
        workflowExecution,
        stepExecutions,
      });
    } else if (finalStatus === ExecutionStatus.CANCELLED) {
      this.reportWorkflowExecutionCancelled({
        workflowExecution,
        stepExecutions,
      });
    }
    // Note: SKIPPED status is not currently tracked in telemetry
  }

  /**
   * Reports when a workflow execution completes successfully.
   * Note: We only report completion/failure/cancellation events (not started) to reduce telemetry load.
   */
  reportWorkflowExecutionCompleted(params: {
    workflowExecution: EsWorkflowExecution;
    stepExecutions: EsWorkflowStepExecution[];
  }): void {
    const { workflowExecution, stepExecutions } = params;
    const workflowMetadata = extractWorkflowMetadata(workflowExecution.workflowDefinition);
    const executionMetadata = extractExecutionMetadata(workflowExecution, stepExecutions);

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
      ...(executionMetadata.ruleId && { ruleId: executionMetadata.ruleId }),
      startedAt: workflowExecution.createdAt,
      completedAt,
      duration,
      ...(executionMetadata.timeToFirstStep !== undefined && {
        timeToFirstStep: executionMetadata.timeToFirstStep,
      }),
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
      executedConnectorTypes: executionMetadata.executedConnectorTypes,
      maxExecutionDepth: executionMetadata.maxExecutionDepth,
      hasRetries: executionMetadata.hasRetries,
      hasErrorHandling: executionMetadata.hasErrorHandling,
      uniqueStepIdsExecuted: executionMetadata.uniqueStepIdsExecuted,
      ...(executionMetadata.queueDelayMs !== undefined && {
        queueDelayMs: executionMetadata.queueDelayMs,
      }),
      timedOut: executionMetadata.timedOut,
      ...(executionMetadata.timeoutMs !== undefined && { timeoutMs: executionMetadata.timeoutMs }),
      ...(executionMetadata.timeoutExceededByMs !== undefined && {
        timeoutExceededByMs: executionMetadata.timeoutExceededByMs,
      }),
      ...(executionMetadata.stepDurations &&
        executionMetadata.stepDurations.length > 0 && {
          stepDurations: executionMetadata.stepDurations,
        }),
      ...(executionMetadata.stepAvgDurationsByType &&
        Object.keys(executionMetadata.stepAvgDurationsByType).length > 0 && {
          stepAvgDurationsByType: executionMetadata.stepAvgDurationsByType,
        }),
    };

    this.reportEvent(WorkflowExecutionTelemetryEventTypes.WorkflowExecutionCompleted, eventData);
  }

  /**
   * Reports when a workflow execution fails.
   */
  reportWorkflowExecutionFailed(params: {
    workflowExecution: EsWorkflowExecution;
    stepExecutions: EsWorkflowStepExecution[];
  }): void {
    const { workflowExecution, stepExecutions } = params;
    const workflowMetadata = extractWorkflowMetadata(workflowExecution.workflowDefinition);
    const executionMetadata = extractExecutionMetadata(workflowExecution, stepExecutions);

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
      ...(executionMetadata.ruleId && { ruleId: executionMetadata.ruleId }),
      startedAt: workflowExecution.createdAt,
      failedAt,
      duration,
      ...(executionMetadata.timeToFirstStep !== undefined && {
        timeToFirstStep: executionMetadata.timeToFirstStep,
      }),
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
      executedConnectorTypes: executionMetadata.executedConnectorTypes,
      maxExecutionDepth: executionMetadata.maxExecutionDepth,
      hasRetries: executionMetadata.hasRetries,
      hasErrorHandling: executionMetadata.hasErrorHandling,
      uniqueStepIdsExecuted: executionMetadata.uniqueStepIdsExecuted,
      errorHandled,
      ...(executionMetadata.queueDelayMs !== undefined && {
        queueDelayMs: executionMetadata.queueDelayMs,
      }),
      timedOut: executionMetadata.timedOut,
      ...(executionMetadata.timeoutMs !== undefined && { timeoutMs: executionMetadata.timeoutMs }),
      ...(executionMetadata.timeoutExceededByMs !== undefined && {
        timeoutExceededByMs: executionMetadata.timeoutExceededByMs,
      }),
      ...(executionMetadata.stepDurations &&
        executionMetadata.stepDurations.length > 0 && {
          stepDurations: executionMetadata.stepDurations,
        }),
      ...(executionMetadata.stepAvgDurationsByType &&
        Object.keys(executionMetadata.stepAvgDurationsByType).length > 0 && {
          stepAvgDurationsByType: executionMetadata.stepAvgDurationsByType,
        }),
    };

    this.reportEvent(WorkflowExecutionTelemetryEventTypes.WorkflowExecutionFailed, eventData);
  }

  /**
   * Reports when a workflow execution is cancelled.
   */
  reportWorkflowExecutionCancelled(params: {
    workflowExecution: EsWorkflowExecution;
    stepExecutions: EsWorkflowStepExecution[];
  }): void {
    const { workflowExecution, stepExecutions } = params;
    const workflowMetadata = extractWorkflowMetadata(workflowExecution.workflowDefinition);
    const executionMetadata = extractExecutionMetadata(workflowExecution, stepExecutions);

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
      ...(executionMetadata.ruleId && { ruleId: executionMetadata.ruleId }),
      startedAt: workflowExecution.createdAt,
      cancelledAt,
      duration,
      ...(executionMetadata.timeToFirstStep !== undefined && {
        timeToFirstStep: executionMetadata.timeToFirstStep,
      }),
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
      ...(workflowExecution.cancelledBy && {
        cancelledBy: workflowExecution.cancelledBy,
      }),
      executedStepCount: executionMetadata.executedStepCount,
      successfulStepCount: executionMetadata.successfulStepCount,
      executedConnectorTypes: executionMetadata.executedConnectorTypes,
      maxExecutionDepth: executionMetadata.maxExecutionDepth,
      hasRetries: executionMetadata.hasRetries,
      hasErrorHandling: executionMetadata.hasErrorHandling,
      uniqueStepIdsExecuted: executionMetadata.uniqueStepIdsExecuted,
      ...(executionMetadata.queueDelayMs !== undefined && {
        queueDelayMs: executionMetadata.queueDelayMs,
      }),
      timedOut: executionMetadata.timedOut,
      ...(executionMetadata.timeoutMs !== undefined && { timeoutMs: executionMetadata.timeoutMs }),
      ...(executionMetadata.timeoutExceededByMs !== undefined && {
        timeoutExceededByMs: executionMetadata.timeoutExceededByMs,
      }),
      ...(executionMetadata.stepDurations &&
        executionMetadata.stepDurations.length > 0 && {
          stepDurations: executionMetadata.stepDurations,
        }),
      ...(executionMetadata.stepAvgDurationsByType &&
        Object.keys(executionMetadata.stepAvgDurationsByType).length > 0 && {
          stepAvgDurationsByType: executionMetadata.stepAvgDurationsByType,
        }),
    };

    this.reportEvent(WorkflowExecutionTelemetryEventTypes.WorkflowExecutionCancelled, eventData);
  }
}
