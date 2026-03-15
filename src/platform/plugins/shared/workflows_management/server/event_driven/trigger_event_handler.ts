/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import type { WorkflowDetailDto, WorkflowExecutionEngineModel } from '@kbn/workflows';
import type { TriggerEventHandlerParams } from '@kbn/workflows-extensions/server';
import type { ResolveMatchingWorkflowSubscriptionsParams } from './resolve_workflow_subscriptions';
import { validateWorkflowForExecution } from '../connectors/workflows/validate_workflow_for_execution';
import { type TriggerEventsDataStreamClient, writeTriggerEvent } from '../trigger_events_log';
import type { WorkflowsManagementApi } from '../workflows_management/workflows_management_api';

export interface CreateTriggerEventHandlerParams {
  api: WorkflowsManagementApi;
  logger: Logger;
  getTriggerEventsClient: () => TriggerEventsDataStreamClient | null;
  resolveMatchingWorkflowSubscriptions: (
    params: ResolveMatchingWorkflowSubscriptionsParams
  ) => Promise<WorkflowDetailDto[]>;
}

/**
 * Creates the trigger event handler that runs when emitEvent is called.
 * Writes the event to the trigger-events data stream (audit), then resolves workflows
 * subscribed to the trigger and runs each with the event payload in parallel.
 * Uses the request from emitEvent so executions are attributed to the calling user.
 */
export function createTriggerEventHandler({
  api,
  logger,
  getTriggerEventsClient,
  resolveMatchingWorkflowSubscriptions,
}: CreateTriggerEventHandlerParams): (params: TriggerEventHandlerParams) => Promise<void> {
  return async (params: TriggerEventHandlerParams): Promise<void> => {
    const { timestamp, triggerId, payload, request, spaceId } = params;

    const eventContext = { ...payload, timestamp, spaceId };
    const workflows = await resolveMatchingWorkflowSubscriptions({
      triggerId,
      spaceId,
      eventContext,
    });
    const subscriptions = workflows.map((w) => w.id);

    const client = getTriggerEventsClient();
    if (client) {
      try {
        await writeTriggerEvent(client, {
          timestamp,
          triggerId,
          spaceId,
          subscriptions,
          payload,
        });
      } catch (error) {
        logger.warn(
          `Failed to write trigger event to data stream (trigger: ${triggerId}): ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    if (workflows.length === 0) {
      return;
    }

    const runWorkflowPromises = workflows.map(async (workflow) => {
      validateWorkflowForExecution(workflow, workflow.id);
      const workflowToRun: WorkflowExecutionEngineModel = {
        id: workflow.id,
        name: workflow.name,
        enabled: workflow.enabled,
        definition: workflow.definition,
        yaml: workflow.yaml,
      };
      await api.runWorkflow(workflowToRun, spaceId, { event: eventContext }, request, triggerId);
    });

    const results = await Promise.allSettled(runWorkflowPromises);
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const workflow = workflows[index];
        const message =
          result.reason instanceof Error ? result.reason.message : String(result.reason);
        logger.warn(
          `Event-driven workflow execution failed for workflow ${workflow.id} (trigger: ${triggerId}): ${message}`
        );
      }
    });
  };
}
