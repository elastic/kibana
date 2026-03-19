/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import pLimit from 'p-limit';
import type { Logger } from '@kbn/core/server';
import type { WorkflowDetailDto, WorkflowExecutionEngineModel } from '@kbn/workflows';
import type { WorkflowsExecutionEnginePluginStart } from '@kbn/workflows-execution-engine/server';
import type { TriggerEventHandlerParams } from '@kbn/workflows-extensions/server';
import type { ResolveMatchingWorkflowSubscriptionsParams } from './resolve_workflow_subscriptions';
import { validateWorkflowForExecution } from '../connectors/workflows/validate_workflow_for_execution';
import { type TriggerEventsDataStreamClient, writeTriggerEvent } from '../trigger_events_log';
import type { WorkflowsManagementApi } from '../workflows_management/workflows_management_api';

const SCHEDULE_CONCURRENCY = 20;

async function writeTriggerEvents(
  client: TriggerEventsDataStreamClient | null,
  logEventsEnabled: boolean,
  params: {
    timestamp: string;
    triggerId: string;
    spaceId: string;
    subscriptions: string[];
    payload: Record<string, unknown>;
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

async function scheduleMatchingWorkflows(
  api: WorkflowsManagementApi,
  workflows: WorkflowDetailDto[],
  spaceId: string,
  eventContext: Record<string, unknown>,
  request: TriggerEventHandlerParams['request'],
  triggerId: string,
  logger: Logger
): Promise<void> {
  if (workflows.length === 0) {
    return;
  }
  const scheduleConcurrency = pLimit(SCHEDULE_CONCURRENCY);
  const schedulePromises = workflows.map((workflow) =>
    scheduleConcurrency(async () => {
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
        triggerId
      );
    })
  );
  const results = await Promise.allSettled(schedulePromises);
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      const workflow = workflows[index];
      const message =
        result.reason instanceof Error ? result.reason.message : String(result.reason);
      logger.warn(
        `Event-driven workflow scheduling failed for workflow ${workflow.id} (trigger: ${triggerId}): ${message}`
      );
    }
  });
}

export interface CreateTriggerEventHandlerParams {
  api: WorkflowsManagementApi;
  logger: Logger;
  getTriggerEventsClient: () => TriggerEventsDataStreamClient | null;
  getWorkflowExecutionEngine: () => Promise<WorkflowsExecutionEnginePluginStart>;
  resolveMatchingWorkflowSubscriptions: (
    params: ResolveMatchingWorkflowSubscriptionsParams
  ) => Promise<WorkflowDetailDto[]>;
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
  getTriggerEventsClient,
  getWorkflowExecutionEngine,
  resolveMatchingWorkflowSubscriptions,
}: CreateTriggerEventHandlerParams): (params: TriggerEventHandlerParams) => Promise<void> {
  return async (params: TriggerEventHandlerParams): Promise<void> => {
    const engine = await getWorkflowExecutionEngine();
    const executionEnabled = engine.isEventDrivenExecutionEnabled();
    const logEventsEnabled = engine.isLogTriggerEventsEnabled();

    if (!executionEnabled && !logEventsEnabled) {
      logger.debug(
        'Event-driven execution is disabled (eventDrivenExecutionEnabled: false); skipping workflow scheduling.'
      );
      return;
    }

    const { timestamp, triggerId, payload, request, spaceId } = params;
    const eventContext = { ...payload, timestamp, spaceId };
    const workflows = await resolveMatchingWorkflowSubscriptions({
      triggerId,
      spaceId,
      eventContext,
    });
    const subscriptions = workflows.map((w) => w.id);

    await writeTriggerEvents(
      getTriggerEventsClient(),
      logEventsEnabled,
      { timestamp, triggerId, spaceId, subscriptions, payload },
      logger
    );

    if (executionEnabled && workflows.length > 0) {
      await scheduleMatchingWorkflows(
        api,
        workflows,
        spaceId,
        eventContext,
        request,
        triggerId,
        logger
      );
    }
  };
}
