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
import type { CoreStart, KibanaRequest, Logger } from '@kbn/core/server';
import type { SpacesServiceStart } from '@kbn/spaces-plugin/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-utils';
import type { WorkflowDetailDto, WorkflowExecutionEngineModel } from '@kbn/workflows';
import { WorkflowRepository } from '@kbn/workflows';
import { validateWorkflowForExecution } from '@kbn/workflows/server';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import { type EventChainContext, getEventChainContext } from './event_context/event_chain_context';
import type { TriggerEventsDataStreamClient } from './event_logs';
import { initializeTriggerEventsClient } from './event_logs';
import { classifyWorkflowTriggerMatch } from './filter_workflows_by_trigger_condition';
import {
  createEmptyTriggerResolutionStats,
  createEmptyTriggerScheduleStats,
  type TriggerEventScheduleStats,
} from './trigger_event_stats';
import type { EventTriggersConfig } from '../config';
import { WorkflowExecutionTelemetryClient } from '../lib/telemetry/workflow_execution_telemetry_client';
import type { ScheduleWorkflow } from '../types';

const SCHEDULE_CONCURRENCY = 20;

export interface EmitEventParams {
  triggerId: string;
  payload: Record<string, unknown>;
  request: KibanaRequest;
}

export type EmitEvent = (params: EmitEventParams) => Promise<void>;

export interface TriggerEventHandlerDeps {
  coreStart: CoreStart;
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
  spaces: SpacesServiceStart | undefined;
  scheduleWorkflow: ScheduleWorkflow;
  config: EventTriggersConfig;
  logger: Logger;
}

interface ScheduleEventParams {
  payload: Record<string, unknown>;
  timestamp: string;
  spaceId: string;
  eventId: string;
  eventChainContext?: EventChainContext;
  triggerId: string;
}

/**
 * Handles trigger events end-to-end: validates the trigger, resolves subscribed workflows,
 * evaluates KQL conditions, writes audit logs, schedules executions, and reports telemetry.
 */
export class TriggerEventHandler {
  private readonly workflowRepository: WorkflowRepository;
  private readonly workflowsExtensions: WorkflowsExtensionsServerPluginStart;
  private readonly scheduleWorkflow: ScheduleWorkflow;
  private readonly telemetryClient: WorkflowExecutionTelemetryClient;
  private readonly spaces: SpacesServiceStart | undefined;
  private readonly config: EventTriggersConfig;
  private readonly logger: Logger;
  private readonly triggerEventsClientPromise: Promise<TriggerEventsDataStreamClient>;

  constructor(deps: TriggerEventHandlerDeps) {
    this.scheduleWorkflow = deps.scheduleWorkflow;
    this.spaces = deps.spaces;
    this.workflowsExtensions = deps.workflowsExtensions;
    this.config = deps.config;
    this.logger = deps.logger;

    const coreStart = deps.coreStart;
    this.telemetryClient = new WorkflowExecutionTelemetryClient(coreStart.analytics, deps.logger);

    const esClient = coreStart.elasticsearch.client.asInternalUser;
    this.workflowRepository = new WorkflowRepository({ esClient, logger: this.logger });
    this.triggerEventsClientPromise = initializeTriggerEventsClient(coreStart.dataStreams);
  }

  async handleEvent(params: EmitEventParams): Promise<void> {
    if (!this.config.enabled && !this.config.logEvents) {
      this.logger.debug('Event-driven triggers are disabled; skipping workflow scheduling.');
      return;
    }
    const { triggerId, payload, request } = params;

    const spaceId = this.spaces?.getSpaceId(request) ?? DEFAULT_SPACE_ID;

    this.validateTrigger(triggerId, spaceId, payload);

    const timestamp = new Date().toISOString();
    const resolutionStartMs = Date.now();
    const eventId = generateUuid();

    const { workflows, stats: resolutionStats } = await this.resolveMatchingWorkflowSubscriptions(
      triggerId,
      spaceId,
      { ...payload, timestamp, spaceId }
    );
    const subscriberResolutionMs = Math.max(0, Date.now() - resolutionStartMs);
    this.logger.trace(
      `Workflows trigger resolution funnel: triggerId=${triggerId} ${JSON.stringify(
        resolutionStats
      )}`
    );

    const eventChainContext = getEventChainContext(request);
    if (this.config.logEvents) {
      await this.writeTriggerEvents({
        timestamp,
        eventId,
        triggerId,
        spaceId,
        subscriptions: workflows.map((w) => w.id),
        payload,
        ...(eventChainContext?.sourceExecutionId && {
          sourceExecutionId: eventChainContext.sourceExecutionId,
        }),
      });
    }

    let scheduleStats: TriggerEventScheduleStats;
    if (this.config.enabled && workflows.length > 0) {
      const eventParams: ScheduleEventParams = {
        payload,
        timestamp,
        spaceId,
        eventId,
        eventChainContext,
        triggerId,
      };
      scheduleStats = await this.scheduleMatchingWorkflows(workflows, request, eventParams);
      this.logger.trace(
        `Workflows trigger schedule outcomes: triggerId=${triggerId} ${JSON.stringify(
          scheduleStats
        )}`
      );
    } else {
      scheduleStats = createEmptyTriggerScheduleStats();
    }

    this.telemetryClient.reportTriggerEventDispatched({
      triggerId,
      eventId,
      config: this.config,
      eventChainContext,
      subscriberResolutionMs,
      resolutionStats,
      scheduleStats,
    });
  }

  private validateTrigger(
    triggerId: string,
    spaceId: string,
    payload: Record<string, unknown>
  ): void {
    const definition = this.workflowsExtensions.getTriggerDefinition(triggerId);
    if (!definition) {
      throw new Error(
        `Trigger "${triggerId}" is not registered. Register it during plugin setup via registerTriggerDefinition.`
      );
    }

    if (definition.eventSchema && typeof definition.eventSchema.safeParse === 'function') {
      const result = definition.eventSchema.safeParse(payload);
      if (!result.success) {
        const message = result.error instanceof Error ? result.error.message : String(result.error);
        throw new Error(
          `Event payload for trigger "${triggerId}" (space: ${spaceId}) did not match the trigger's eventSchema. ${message}`
        );
      }
    }
  }

  private async resolveMatchingWorkflowSubscriptions(
    triggerId: string,
    spaceId: string,
    payload: Record<string, unknown>
  ) {
    const allWorkflows = await this.workflowRepository.getWorkflowsSubscribedToTrigger(
      triggerId,
      spaceId
    );

    const stats = createEmptyTriggerResolutionStats();
    stats.subscribedCount = allWorkflows.length;
    const workflows: WorkflowDetailDto[] = [];

    for (const workflow of allWorkflows) {
      const outcome = classifyWorkflowTriggerMatch(workflow, triggerId, payload, this.logger);
      switch (outcome) {
        case 'disabled':
          stats.disabledCount += 1;
          break;
        case 'kql_false':
          stats.kqlFalseCount += 1;
          break;
        case 'kql_error':
          stats.kqlErrorCount += 1;
          break;
        case 'matched':
          stats.matchedCount += 1;
          workflows.push(workflow);
          break;
      }
    }

    return { workflows, stats };
  }

  private async writeTriggerEvents(params: {
    timestamp: string;
    eventId: string;
    triggerId: string;
    spaceId: string;
    subscriptions: string[];
    payload: Record<string, unknown>;
    sourceExecutionId?: string;
  }): Promise<void> {
    try {
      const triggerEventsClient = await this.triggerEventsClientPromise;
      const doc = {
        '@timestamp': params.timestamp,
        eventId: params.eventId,
        triggerId: params.triggerId,
        spaceId: params.spaceId,
        subscriptions: params.subscriptions,
        payload: params.payload,
        ...(params.sourceExecutionId !== undefined && params.sourceExecutionId !== ''
          ? { sourceExecutionId: params.sourceExecutionId }
          : {}),
      };
      await triggerEventsClient.create({ documents: [doc] });
    } catch (error) {
      this.logger.warn(
        `Failed to write trigger event to data stream (trigger: ${params.triggerId}): ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  private async scheduleMatchingWorkflows(
    workflows: WorkflowDetailDto[],
    request: KibanaRequest,
    eventParams: ScheduleEventParams
  ): Promise<TriggerEventScheduleStats> {
    if (workflows.length === 0) {
      return createEmptyTriggerScheduleStats();
    }
    const scheduleConcurrency = pLimit(SCHEDULE_CONCURRENCY);
    const schedulePromises = workflows.map((workflow) =>
      scheduleConcurrency(async (): Promise<'depth_skipped' | 'success' | 'failure'> => {
        const eventContext = this.getEventContextForScheduledWorkflow(
          workflow,
          eventParams,
          this.config.maxChainDepth
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
          const context: Record<string, unknown> = {
            event: eventContext,
            spaceId: eventParams.spaceId,
            inputs: {},
            triggeredBy: eventParams.triggerId,
            metadata: {
              eventDispatchTimestamp: eventParams.timestamp,
              eventTriggerId: eventParams.triggerId,
              eventId: eventParams.eventId,
            },
          };
          await this.scheduleWorkflow(workflowToRun, context, request);
          return 'success';
        } catch (reason) {
          const message = reason instanceof Error ? reason.message : String(reason);
          this.logger.warn(
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
        this.logger.warn(
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

  private getEventContextForScheduledWorkflow(
    workflow: WorkflowDetailDto,
    eventParams: ScheduleEventParams,
    maxEventChainDepth: number
  ): Record<string, unknown> | null {
    const { payload, timestamp, spaceId, eventChainContext, triggerId } = eventParams;
    const newDepth = (eventChainContext?.depth ?? 0) + 1;
    if (newDepth > maxEventChainDepth) {
      this.logger.warn(
        `Event chain depth (${newDepth}) exceeds max (${maxEventChainDepth}); skipping workflow ${workflow.id} (trigger: ${triggerId}, space: ${spaceId}) to prevent unbounded chains.`
      );
      return null;
    }
    return { ...payload, timestamp, spaceId, eventChainDepth: newDepth };
  }
}
