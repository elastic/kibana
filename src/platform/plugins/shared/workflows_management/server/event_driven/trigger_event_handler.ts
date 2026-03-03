/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import type { WorkflowExecutionEngineModel } from '@kbn/workflows';
import type { TriggerEventHandlerParams } from '@kbn/workflows-extensions/server';
import { workflowMatchesTriggerCondition } from './filter_workflows_by_trigger_condition';
import { validateWorkflowForExecution } from '../connectors/workflows/validate_workflow_for_execution';
import { type TriggerEventsDataStreamClient, writeTriggerEvent } from '../trigger_events_log';
import type { WorkflowsManagementApi } from '../workflows_management/workflows_management_api';

export interface CreateTriggerEventHandlerParams {
  api: WorkflowsManagementApi;
  logger: Logger;
  getTriggerEventsClient: () => TriggerEventsDataStreamClient | null;
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
}: CreateTriggerEventHandlerParams): (params: TriggerEventHandlerParams) => Promise<void> {
  return async (params: TriggerEventHandlerParams): Promise<void> => {
    const { timestamp, triggerId, payload, request } = params;
    const spaceId = params.spaceId ?? 'default';

    const allWorkflows = await api.getWorkflowsSubscribedToTrigger(triggerId, spaceId);
    const eventContext = { ...payload, timestamp, spaceId };
    const workflows = allWorkflows.filter((w) =>
      workflowMatchesTriggerCondition(w, triggerId, eventContext, logger)
    );
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

    await Promise.all(
      workflows.map(async (workflow) => {
        try {
          validateWorkflowForExecution(workflow, workflow.id);
          const workflowToRun: WorkflowExecutionEngineModel = {
            id: workflow.id,
            name: workflow.name,
            enabled: workflow.enabled,
            definition: workflow.definition,
            yaml: workflow.yaml,
          };
          await api.runWorkflow(
            workflowToRun,
            spaceId,
            { event: eventContext },
            request,
            triggerId
          );
        } catch (error) {
          logger.warn(
            `Event-driven workflow execution failed for workflow ${
              workflow.id
            } (trigger: ${triggerId}): ${error instanceof Error ? error.message : String(error)}`
          );
        }
      })
    );
  };
}
