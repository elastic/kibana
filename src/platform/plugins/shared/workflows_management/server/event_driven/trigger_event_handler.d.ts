import type { Logger } from '@kbn/core/server';
import type { WorkflowDetailDto } from '@kbn/workflows';
import type { WorkflowsExecutionEnginePluginStart } from '@kbn/workflows-execution-engine/server';
import type { TriggerEventHandlerParams } from '@kbn/workflows-extensions/server';
import type { ResolveMatchingWorkflowSubscriptionsParams } from './resolve_workflow_subscriptions';
import { type TriggerEventsDataStreamClient } from '../trigger_events_log';
import type { WorkflowsManagementApi } from '../workflows_management/workflows_management_api';
export interface CreateTriggerEventHandlerParams {
    api: WorkflowsManagementApi;
    logger: Logger;
    getTriggerEventsClient: () => TriggerEventsDataStreamClient | null;
    getWorkflowExecutionEngine: () => Promise<WorkflowsExecutionEnginePluginStart>;
    resolveMatchingWorkflowSubscriptions: (params: ResolveMatchingWorkflowSubscriptionsParams) => Promise<WorkflowDetailDto[]>;
}
/**
 * Creates the trigger event handler that runs when emitEvent is called.
 * Writes the event to the trigger-events data stream (audit), then resolves workflows
 * subscribed to the trigger and schedules each via Task Manager (workflow:run task).
 * Uses the request from emitEvent so executions are attributed to the calling user.
 * Scheduling is capped with p-limit to avoid ES/TM overload when many workflows match.
 */
export declare function createTriggerEventHandler({ api, logger, getTriggerEventsClient, getWorkflowExecutionEngine, resolveMatchingWorkflowSubscriptions, }: CreateTriggerEventHandlerParams): (params: TriggerEventHandlerParams) => Promise<void>;
