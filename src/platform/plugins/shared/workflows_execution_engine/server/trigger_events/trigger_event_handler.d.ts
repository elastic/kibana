import type { CoreStart, KibanaRequest, Logger } from '@kbn/core/server';
import type { SpacesServiceStart } from '@kbn/spaces-plugin/server';
import { type WorkflowRepository } from '@kbn/workflows/server';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import type { EventTriggersConfig } from '../config';
import type { ScheduleWorkflow } from '../types';
export interface EmitEventParams {
    triggerId: string;
    payload: Record<string, unknown>;
    request: KibanaRequest;
}
export type EmitEvent = (params: EmitEventParams) => Promise<void>;
export interface TriggerEventHandlerDeps {
    coreStart: CoreStart;
    workflowRepository: WorkflowRepository;
    workflowsExtensions: WorkflowsExtensionsServerPluginStart;
    spaces: SpacesServiceStart | undefined;
    scheduleWorkflow: ScheduleWorkflow;
    config: EventTriggersConfig;
    logger: Logger;
}
/**
 * Handles trigger events end-to-end: validates the trigger, resolves subscribed workflows,
 * evaluates KQL conditions, writes audit logs, schedules executions, and reports telemetry.
 */
export declare class TriggerEventHandler {
    private readonly workflowRepository;
    private readonly workflowExecutionRepository;
    private readonly workflowsExtensions;
    private readonly scheduleWorkflow;
    private readonly telemetryClient;
    private readonly spaces;
    private readonly config;
    private readonly logger;
    private readonly triggerEventsClientPromise;
    constructor(deps: TriggerEventHandlerDeps);
    handleEvent(params: EmitEventParams): Promise<void>;
    /**
     * Ensures the trigger is registered and, when defined, `eventSchema` matches the same event object
     * used for KQL resolution and scheduling (`timestamp`, `spaceId`, `eventChainDepth` included).
     */
    private validateTrigger;
    private eventChainContextFromExecution;
    private resolveEventChainContextFromEmitterExecution;
    private resolveMatchingWorkflowSubscriptions;
    private writeTriggerEvents;
    private getEventContextForScheduledWorkflow;
    private scheduleMatchingWorkflows;
}
