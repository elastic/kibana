/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AnalyticsServiceSetup, AnalyticsServiceStart, Logger } from '@kbn/core/server';
import type {
  EsWorkflowExecution,
  EsWorkflowStepExecution,
  WellKnownWorkflowTriggerSource,
} from '@kbn/workflows';
import {
  ExecutionStatus,
  isEventDrivenWorkflowTriggerSource,
  isWellKnownWorkflowTriggerSource,
} from '@kbn/workflows';
import {
  workflowExecutionEventNames,
  workflowExecutionEventSchemas,
} from './events/workflows_execution';
import {
  type EventDrivenExecutionSuppressedParams,
  type OutputSizeStats,
  type OutputSizeTelemetryFields,
  type TriggerEventDispatchedParams,
  type WorkflowExecutionCancelledParams,
  type WorkflowExecutionCompletedParams,
  type WorkflowExecutionFailedParams,
  type WorkflowExecutionTelemetryEventsMap,
  WorkflowExecutionTelemetryEventTypes,
} from './events/workflows_execution/types';
import {
  extractExecutionMetadata,
  type WorkflowExecutionTelemetryMetadata,
} from './utils/extract_execution_metadata';
import { extractWorkflowMetadata } from './utils/extract_workflow_metadata';
import type { EventTriggersConfig } from '../../config';
import type { EventChainContext } from '../../trigger_events/event_context/event_chain_context';
import type {
  TriggerEventScheduleStats,
  TriggerResolutionStats,
} from '../../trigger_events/trigger_event_stats';

/** Picks the output-size telemetry fields from execution metadata, omitting undefined entries. */
const pickOutputSizeFields = (
  metadata: WorkflowExecutionTelemetryMetadata
): OutputSizeTelemetryFields => ({
  ...(metadata.totalOutputSizeBytes !== undefined && {
    totalOutputSizeBytes: metadata.totalOutputSizeBytes,
  }),
  ...(metadata.averageOutputSizeBytes !== undefined && {
    averageOutputSizeBytes: metadata.averageOutputSizeBytes,
  }),
});

function resolveExecutionTriggerTelemetry(triggeredBy: string | undefined): {
  triggerType: WellKnownWorkflowTriggerSource | 'event';
  eventTriggerId?: string;
} {
  if (isWellKnownWorkflowTriggerSource(triggeredBy)) {
    return { triggerType: triggeredBy };
  }
  if (isEventDrivenWorkflowTriggerSource(triggeredBy)) {
    return { triggerType: 'event', eventTriggerId: triggeredBy };
  }

  return { triggerType: 'manual' };
}

/**
 * Resolved per-call inputs for the three terminal-event builders. Computing
 * these once and passing them around drops the trio of identical mappings
 * each report function used to repeat.
 */
interface TerminalEventInputs {
  workflowExecution: EsWorkflowExecution;
  workflowMetadata: ReturnType<typeof extractWorkflowMetadata>;
  executionMetadata: WorkflowExecutionTelemetryMetadata;
}

/**
 * Builds the shared payload common to Completed / Failed / Cancelled telemetry
 * events. Event-specific fields (failure cause, cancellation reason, etc.)
 * are merged in by each caller.
 *
 * Conditional fields use the spread-when-defined idiom so the resulting
 * object only carries keys that have a real value — matches the registered
 * event schemas, which omit the same fields rather than send `undefined`.
 */
function buildTerminalEventBase({
  workflowExecution,
  workflowMetadata,
  executionMetadata,
}: TerminalEventInputs) {
  return {
    ...buildBaseExecutionTelemetryFields(workflowExecution, executionMetadata),
    startedAt: workflowExecution.createdAt,
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
    executedConnectorTypes: executionMetadata.executedConnectorTypes,
    maxExecutionDepth: executionMetadata.maxExecutionDepth,
    hasRetries: executionMetadata.hasRetries,
    hasErrorHandling: executionMetadata.hasErrorHandling,
    uniqueStepIdsExecuted: executionMetadata.uniqueStepIdsExecuted,
    ...(executionMetadata.queueDelayMs !== undefined && {
      queueDelayMs: executionMetadata.queueDelayMs,
    }),
    ...(executionMetadata.emitToStartMs !== undefined && {
      emitToStartMs: executionMetadata.emitToStartMs,
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
    ...pickOutputSizeFields(executionMetadata),
  };
}

/**
 * Resolves the inputs once per terminal-event report. Centralising this also
 * means callers do not have to remember to thread `outputSizeStats` through
 * `extractExecutionMetadata`.
 */
function buildTerminalEventInputs(
  workflowExecution: EsWorkflowExecution,
  stepExecutions: EsWorkflowStepExecution[],
  outputSizeStats?: OutputSizeStats
): TerminalEventInputs {
  return {
    workflowExecution,
    workflowMetadata: extractWorkflowMetadata(workflowExecution.workflowDefinition),
    executionMetadata: extractExecutionMetadata(workflowExecution, stepExecutions, outputSizeStats),
  };
}

/**
 * Shared base fields for all workflow execution telemetry events (IDs, trigger, alert rule, composition).
 */
function buildBaseExecutionTelemetryFields(
  workflowExecution: EsWorkflowExecution,
  executionMetadata: WorkflowExecutionTelemetryMetadata
) {
  const { triggerType, eventTriggerId } = resolveExecutionTriggerTelemetry(
    workflowExecution.triggeredBy
  );
  return {
    workflowExecutionId: workflowExecution.id,
    workflowId: workflowExecution.workflowId,
    spaceId: workflowExecution.spaceId,
    triggerType,
    ...(eventTriggerId !== undefined ? { eventTriggerId } : {}),
    isTestRun: workflowExecution.isTestRun || false,
    ...(executionMetadata.ruleId && { ruleId: executionMetadata.ruleId }),
    ...(executionMetadata.compositionDepth !== undefined && {
      compositionDepth: executionMetadata.compositionDepth,
    }),
    ...(executionMetadata.parentWorkflowId && {
      parentWorkflowId: executionMetadata.parentWorkflowId,
    }),
    ...(executionMetadata.parentWorkflowInvocation && {
      parentWorkflowInvocation: executionMetadata.parentWorkflowInvocation,
    }),
    ...(executionMetadata.eventChainDepth !== undefined && {
      eventChainDepth: executionMetadata.eventChainDepth,
    }),
  };
}

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
    outputSizeStats?: OutputSizeStats;
  }): void {
    const { workflowExecution, stepExecutions, finalStatus, outputSizeStats } = params;

    if (finalStatus === ExecutionStatus.COMPLETED) {
      this.reportWorkflowExecutionCompleted({
        workflowExecution,
        stepExecutions,
        outputSizeStats,
      });
    } else if (
      finalStatus === ExecutionStatus.FAILED ||
      finalStatus === ExecutionStatus.TIMED_OUT
    ) {
      this.reportWorkflowExecutionFailed({
        workflowExecution,
        stepExecutions,
        outputSizeStats,
      });
    } else if (finalStatus === ExecutionStatus.CANCELLED) {
      this.reportWorkflowExecutionCancelled({
        workflowExecution,
        stepExecutions,
        outputSizeStats,
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
    outputSizeStats?: OutputSizeStats;
  }): void {
    const inputs = buildTerminalEventInputs(
      params.workflowExecution,
      params.stepExecutions,
      params.outputSizeStats
    );
    const { workflowExecution, executionMetadata } = inputs;

    const completedAt = workflowExecution.finishedAt || new Date().toISOString();
    const duration =
      new Date(completedAt).getTime() - new Date(workflowExecution.createdAt).getTime();

    const eventData: WorkflowExecutionCompletedParams = {
      eventName:
        workflowExecutionEventNames[
          WorkflowExecutionTelemetryEventTypes.WorkflowExecutionCompleted
        ],
      ...buildTerminalEventBase(inputs),
      completedAt,
      duration,
      failedStepCount: executionMetadata.failedStepCount,
      skippedStepCount: executionMetadata.skippedStepCount,
    };

    this.reportEvent(WorkflowExecutionTelemetryEventTypes.WorkflowExecutionCompleted, eventData);
  }

  /**
   * Reports when a workflow execution fails.
   */
  reportWorkflowExecutionFailed(params: {
    workflowExecution: EsWorkflowExecution;
    stepExecutions: EsWorkflowStepExecution[];
    outputSizeStats?: OutputSizeStats;
  }): void {
    const inputs = buildTerminalEventInputs(
      params.workflowExecution,
      params.stepExecutions,
      params.outputSizeStats
    );
    const { workflowExecution } = inputs;

    const failedAt = workflowExecution.finishedAt || new Date().toISOString();
    const duration = new Date(failedAt).getTime() - new Date(workflowExecution.createdAt).getTime();

    const failedStep = params.stepExecutions.find((step) => step.status === 'failed');
    const errorMessage = workflowExecution.error?.message || 'Unknown error';
    const errorType = workflowExecution.error?.type || 'ExecutionError';
    // Heuristic: a failed step + workflow status FAILED means the on-failure
    // handler did not absorb the error.
    const errorHandled = failedStep !== undefined && workflowExecution.status === 'failed';

    const eventData: WorkflowExecutionFailedParams = {
      eventName:
        workflowExecutionEventNames[WorkflowExecutionTelemetryEventTypes.WorkflowExecutionFailed],
      ...buildTerminalEventBase(inputs),
      failedAt,
      duration,
      errorMessage,
      errorType,
      ...(failedStep && { failedStepId: failedStep.stepId }),
      ...(failedStep?.stepType && { failedStepType: failedStep.stepType }),
      errorHandled,
    };

    this.reportEvent(WorkflowExecutionTelemetryEventTypes.WorkflowExecutionFailed, eventData);
  }

  /**
   * Reports when a workflow execution is cancelled.
   */
  reportWorkflowExecutionCancelled(params: {
    workflowExecution: EsWorkflowExecution;
    stepExecutions: EsWorkflowStepExecution[];
    outputSizeStats?: OutputSizeStats;
  }): void {
    const inputs = buildTerminalEventInputs(
      params.workflowExecution,
      params.stepExecutions,
      params.outputSizeStats
    );
    const { workflowExecution } = inputs;

    const cancelledAt = workflowExecution.cancelledAt || new Date().toISOString();
    const duration =
      new Date(cancelledAt).getTime() - new Date(workflowExecution.createdAt).getTime();

    const eventData: WorkflowExecutionCancelledParams = {
      eventName:
        workflowExecutionEventNames[
          WorkflowExecutionTelemetryEventTypes.WorkflowExecutionCancelled
        ],
      ...buildTerminalEventBase(inputs),
      cancelledAt,
      duration,
      ...(workflowExecution.cancellationReason && {
        cancellationReason: workflowExecution.cancellationReason,
      }),
      ...(workflowExecution.cancelledBy && {
        cancelledBy: workflowExecution.cancelledBy,
      }),
    };

    this.reportEvent(WorkflowExecutionTelemetryEventTypes.WorkflowExecutionCancelled, eventData);
  }

  /**
   * Reports when an event-driven workflow task is skipped at runtime because the operator
   * disabled event-driven execution after the run was scheduled (distinct from handler early exit).
   */
  reportEventDrivenExecutionSuppressed(params: {
    workflowExecution: EsWorkflowExecution;
    logTriggerEventsEnabled: boolean;
  }): void {
    const { workflowExecution, logTriggerEventsEnabled } = params;
    const executionMetadata = extractExecutionMetadata(workflowExecution, []);
    const { triggerType, eventTriggerId } = resolveExecutionTriggerTelemetry(
      workflowExecution.triggeredBy
    );

    const eventData: EventDrivenExecutionSuppressedParams = {
      eventName:
        workflowExecutionEventNames[
          WorkflowExecutionTelemetryEventTypes.EventDrivenExecutionSuppressed
        ],
      workflowExecutionId: workflowExecution.id,
      workflowId: workflowExecution.workflowId,
      spaceId: workflowExecution.spaceId,
      triggerType,
      ...(eventTriggerId !== undefined ? { eventTriggerId } : {}),
      isTestRun: workflowExecution.isTestRun || false,
      ...(executionMetadata.ruleId && { ruleId: executionMetadata.ruleId }),
      ...(executionMetadata.eventChainDepth !== undefined && {
        eventChainDepth: executionMetadata.eventChainDepth,
      }),
      logTriggerEventsEnabled,
    };

    this.reportEvent(
      WorkflowExecutionTelemetryEventTypes.EventDrivenExecutionSuppressed,
      eventData
    );
  }

  reportTriggerEventDispatched(params: {
    triggerId: string;
    config: EventTriggersConfig;
    eventChainContext?: EventChainContext;
    eventId: string;
    subscriberResolutionMs: number;
    resolutionStats: TriggerResolutionStats;
    scheduleStats: TriggerEventScheduleStats;
  }): void {
    const eventData: TriggerEventDispatchedParams = {
      eventName:
        workflowExecutionEventNames[WorkflowExecutionTelemetryEventTypes.TriggerEventDispatched],
      triggerId: params.triggerId,
      eventId: params.eventId,
      executionEnabled: params.config.enabled,
      logEventsEnabled: params.config.logEvents,
      auditOnly: !params.config.enabled && params.config.logEvents,
      eventChainDepth: params.eventChainContext?.depth ?? 0,
      subscriberResolutionMs: params.subscriberResolutionMs,
      ...(params.eventChainContext?.sourceExecutionId && {
        sourceExecutionId: params.eventChainContext.sourceExecutionId,
      }),
      ...params.resolutionStats,
      ...params.scheduleStats,
    };

    this.reportEvent(WorkflowExecutionTelemetryEventTypes.TriggerEventDispatched, eventData);
  }
}
