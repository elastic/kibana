/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import pLimit from 'p-limit';
import { v4 as generateUuid } from 'uuid';
import type { Logger } from '@kbn/core/server';
import type { WorkflowDetailDto, WorkflowExecutionEngineModel } from '@kbn/workflows';
import type { WorkflowsExecutionEnginePluginStart } from '@kbn/workflows-execution-engine/server';
import type {
  EventChainContext,
  TriggerEventHandlerParams,
} from '@kbn/workflows-extensions/server';
import type {
  ResolveMatchingWorkflowSubscriptionsParams,
  ResolveMatchingWorkflowSubscriptionsResult,
} from './resolve_workflow_subscriptions';
import {
  createEmptyTriggerScheduleStats,
  type TriggerEventScheduleStats,
} from './trigger_event_stats';
import type { WorkflowsManagementApi } from '../api/workflows_management_api';
import { validateWorkflowForExecution } from '../connectors/workflows/validate_workflow_for_execution';
import { type TriggerEventDispatchedTelemetryEvent } from '../telemetry/events';
import type { WorkflowsManagementTelemetryClient } from '../telemetry/workflows_management_telemetry_client';
import { type TriggerEventsDataStreamClient, writeTriggerEvent } from '../trigger_events_log';

const SCHEDULE_CONCURRENCY = 20;

async function writeTriggerEvents(
  client: TriggerEventsDataStreamClient | null,
  logEventsEnabled: boolean,
  params: {
    timestamp: string;
    eventId: string;
    triggerId: string;
    spaceId: string;
    subscriptions: string[];
    payload: Record<string, unknown>;
    sourceExecutionId?: string;
  },
  logger: Logger
): Promise<void> {
  if (!client || !logEventsEnabled) {
    return;
  }
  try {
    await writeTriggerEvent(client, params);
  } catch (error) {
    logger.warn(
      `Failed to write trigger event to data stream (trigger: ${params.triggerId}): ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

interface ScheduleEventParams {
  payload: Record<string, unknown>;
  timestamp: string;
  spaceId: string;
  eventId: string;
  eventChainContext?: EventChainContext;
  triggerId: string;
}

function getEventContextForScheduledWorkflow(
  workflow: WorkflowDetailDto,
  eventParams: ScheduleEventParams,
  maxEventChainDepth: number,
  logger: Logger
): Record<string, unknown> | null {
  const { payload, timestamp, spaceId, eventChainContext, triggerId } = eventParams;
  const newDepth = (eventChainContext?.depth ?? 0) + 1;
  if (newDepth > maxEventChainDepth) {
    logger.warn(
      `Event chain depth (${newDepth}) exceeds max (${maxEventChainDepth}); skipping workflow ${workflow.id} (trigger: ${triggerId}, space: ${spaceId}) to prevent unbounded chains.`
    );
    return null;
  }
  return { ...payload, timestamp, spaceId, eventChainDepth: newDepth };
}

async function scheduleMatchingWorkflows(
  api: WorkflowsManagementApi,
  workflows: WorkflowDetailDto[],
  spaceId: string,
  eventParams: ScheduleEventParams,
  maxEventChainDepth: number,
  request: TriggerEventHandlerParams['request'],
  logger: Logger
): Promise<TriggerEventScheduleStats> {
  if (workflows.length === 0) {
    return createEmptyTriggerScheduleStats();
  }
  const scheduleConcurrency = pLimit(SCHEDULE_CONCURRENCY);
  const schedulePromises = workflows.map((workflow) =>
    scheduleConcurrency(async (): Promise<'depth_skipped' | 'success' | 'failure'> => {
      const eventContext = getEventContextForScheduledWorkflow(
        workflow,
        eventParams,
        maxEventChainDepth,
        logger
      );
      if (eventContext === null) {
        return 'depth_skipped';
      }
      try {
        validateWorkflowForExecution(workflow, workflow.id);
        const workflowToRun: WorkflowExecutionEngineModel = {
          id: workflow.id,
          name: workflow.name,
          enabled: workflow.enabled,
          definition: workflow.definition,
          yaml: workflow.yaml,
        };
        await api.scheduleWorkflow(
          workflowToRun,
          spaceId,
          { event: eventContext },
          request,
          eventParams.triggerId,
          {
            eventDispatchTimestamp: eventParams.timestamp,
            eventTriggerId: eventParams.triggerId,
            eventId: eventParams.eventId,
          }
        );
        return 'success';
      } catch (reason) {
        const message = reason instanceof Error ? reason.message : String(reason);
        logger.warn(
          `Event-driven workflow scheduling failed for workflow ${workflow.id} (trigger: ${eventParams.triggerId}): ${message}`
        );
        return 'failure';
      }
    })
  );
  const outcomes = await Promise.allSettled(schedulePromises);
  const stats = createEmptyTriggerScheduleStats();
  for (const [index, outcome] of outcomes.entries()) {
    if (outcome.status === 'rejected') {
      const workflow = workflows[index];
      const message =
        outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason);
      logger.warn(
        `Event-driven workflow scheduling failed for workflow ${workflow.id} (trigger: ${eventParams.triggerId}): ${message}`
      );
      stats.scheduledAttemptCount += 1;
      stats.scheduledFailureCount += 1;
    } else {
      if (outcome.value === 'depth_skipped') {
        stats.depthSkippedCount += 1;
      } else {
        stats.scheduledAttemptCount += 1;
        if (outcome.value === 'success') {
          stats.scheduledSuccessCount += 1;
        } else {
          stats.scheduledFailureCount += 1;
        }
      }
    }
  }
  return stats;
}

export interface CreateTriggerEventHandlerParams {
  api: WorkflowsManagementApi;
  logger: Logger;
  telemetryClient: Pick<WorkflowsManagementTelemetryClient, 'reportTriggerEventDispatched'>;
  getTriggerEventsClient: () => TriggerEventsDataStreamClient | null;
  getWorkflowExecutionEngine: () => Promise<WorkflowsExecutionEnginePluginStart>;
  resolveMatchingWorkflowSubscriptions: (
    params: ResolveMatchingWorkflowSubscriptionsParams
  ) => Promise<ResolveMatchingWorkflowSubscriptionsResult>;
}

/**
 * Creates the trigger event handler that runs when emitEvent is called.
 * Writes the event to the trigger-events data stream (audit), then resolves workflows
 * subscribed to the trigger and schedules each via Task Manager (workflow:run task).
 * Uses the request from emitEvent so executions are attributed to the calling user.
 * Scheduling is capped with p-limit to avoid ES/TM overload when many workflows match.
 */
export function createTriggerEventHandler({
  api,
  logger,
  telemetryClient,
  getTriggerEventsClient,
  getWorkflowExecutionEngine,
  resolveMatchingWorkflowSubscriptions,
}: CreateTriggerEventHandlerParams): (params: TriggerEventHandlerParams) => Promise<void> {
  const reportDispatchedEvent = (event: TriggerEventDispatchedTelemetryEvent): void =>
    telemetryClient.reportTriggerEventDispatched(event);

  return async (params: TriggerEventHandlerParams): Promise<void> => {
    const engine = await getWorkflowExecutionEngine();
    const executionEnabled = engine.isEventDrivenExecutionEnabled();
    const logEventsEnabled = engine.isLogTriggerEventsEnabled();
    const baseTelemetry = {
      triggerId: params.triggerId,
      executionEnabled,
      logEventsEnabled,
    };

    if (!executionEnabled && !logEventsEnabled) {
      logger.debug(
        'Event-driven execution is disabled (eventDrivenExecutionEnabled: false); skipping workflow scheduling.'
      );
      return;
    }

    const { timestamp, triggerId, payload, request, spaceId, eventChainContext } = params;
    const eventId = generateUuid();

    const eventContextForResolution = {
      ...payload,
      timestamp,
      spaceId,
      eventChainDepth: 1,
    };
    const resolutionStartMs = Date.now();
    const { workflows, stats: resolutionStats } = await resolveMatchingWorkflowSubscriptions({
      triggerId,
      spaceId,
      eventContext: eventContextForResolution,
    });
    const subscriberResolutionMs = Math.max(0, Date.now() - resolutionStartMs);
    logger.trace(
      `Workflows trigger resolution funnel: triggerId=${triggerId} ${JSON.stringify(
        resolutionStats
      )}`
    );
    const subscriptions = workflows.map((w) => w.id);

    await writeTriggerEvents(
      getTriggerEventsClient(),
      logEventsEnabled,
      {
        timestamp,
        eventId,
        triggerId,
        spaceId,
        subscriptions,
        payload,
        ...(eventChainContext?.sourceExecutionId !== undefined &&
        eventChainContext.sourceExecutionId !== ''
          ? { sourceExecutionId: eventChainContext.sourceExecutionId }
          : {}),
      },
      logger
    );

    let scheduleStats = createEmptyTriggerScheduleStats();
    if (executionEnabled && workflows.length > 0) {
      const maxEventChainDepth = engine.getMaxEventChainDepth();
      scheduleStats = await scheduleMatchingWorkflows(
        api,
        workflows,
        spaceId,
        { payload, timestamp, spaceId, eventId, eventChainContext, triggerId },
        maxEventChainDepth,
        request,
        logger
      );
      logger.trace(
        `Workflows trigger schedule outcomes: triggerId=${triggerId} ${JSON.stringify(
          scheduleStats
        )}`
      );
    }
    reportDispatchedEvent({
      ...baseTelemetry,
      eventChainDepth: eventChainContext?.depth ?? 0,
      eventId,
      ...(eventChainContext?.sourceExecutionId !== undefined &&
      eventChainContext.sourceExecutionId !== ''
        ? { sourceExecutionId: eventChainContext.sourceExecutionId }
        : {}),
      auditOnly: !executionEnabled && logEventsEnabled,
      subscriberResolutionMs,
      ...resolutionStats,
      ...scheduleStats,
    });
  };
}
