/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { TriggerType, WorkflowYaml } from '@kbn/workflows';
import type { WorkflowExecutionEngineModel } from '@kbn/workflows/types/latest';
import type { WorkflowsExecutionEnginePluginStart } from '@kbn/workflows-execution-engine/server';
import type {
  TriggerEventData,
  WorkflowsExtensionsServerPluginStart,
} from '@kbn/workflows-extensions/server';
import type { WorkflowProperties, WorkflowStorage } from '../storage/workflow_storage';

/**
 * Result of firing a trigger.
 */
export interface FireTriggerResult {
  /** Number of workflows that matched the trigger */
  matchedWorkflows: number;
  /** Number of workflows that were successfully scheduled */
  scheduledWorkflows: number;
  /** IDs of workflows that were scheduled */
  scheduledWorkflowIds: string[];
  /** Any errors that occurred during scheduling */
  errors: Array<{ workflowId: string; error: string }>;
}

/**
 * Options for firing a trigger.
 */
export interface FireTriggerOptions {
  /** The event data that triggered the fire */
  eventData: TriggerEventData;
  /** The Kibana request context (for authorization) */
  request: KibanaRequest;
  /** The space ID where workflows should be searched */
  spaceId: string;
}

/**
 * Service for firing triggers and scheduling matching workflows.
 */
export class TriggerService {
  private readonly logger: Logger;
  private workflowStorage: WorkflowStorage | null = null;
  private workflowsExtensions: WorkflowsExtensionsServerPluginStart | null = null;
  private workflowsExecutionEngine: WorkflowsExecutionEnginePluginStart | null = null;

  constructor(logger: Logger) {
    this.logger = logger.get('trigger-service');
  }

  /**
   * Initialize the service with required dependencies.
   * Must be called during plugin start phase.
   */
  public initialize(deps: {
    workflowStorage: WorkflowStorage;
    workflowsExtensions: WorkflowsExtensionsServerPluginStart;
    workflowsExecutionEngine: WorkflowsExecutionEnginePluginStart;
  }): void {
    this.workflowStorage = deps.workflowStorage;
    this.workflowsExtensions = deps.workflowsExtensions;
    this.workflowsExecutionEngine = deps.workflowsExecutionEngine;
    this.logger.debug('TriggerService initialized');
  }

  /**
   * Fire a trigger and schedule any matching workflows.
   *
   * @param options - The trigger firing options
   * @returns Result of the trigger fire operation
   */
  public async fireTrigger(options: FireTriggerOptions): Promise<FireTriggerResult> {
    const { eventData, request, spaceId } = options;

    if (!this.workflowStorage || !this.workflowsExtensions || !this.workflowsExecutionEngine) {
      throw new Error('TriggerService not initialized');
    }

    this.logger.debug(`Firing trigger: ${eventData.type} in space ${spaceId}`);

    // Get the registered trigger definition
    const triggerDefinition = this.workflowsExtensions.getTriggerDefinition(eventData.type);
    if (!triggerDefinition) {
      this.logger.debug(`No trigger definition registered for type: ${eventData.type}`);
      return {
        matchedWorkflows: 0,
        scheduledWorkflows: 0,
        scheduledWorkflowIds: [],
        errors: [],
      };
    }

    // Find all enabled workflows in the space
    const workflows = await this.findEnabledWorkflows(spaceId);
    this.logger.debug(`Found ${workflows.length} enabled workflows in space ${spaceId}`);

    const matchedWorkflows: Array<{
      id: string;
      workflow: WorkflowProperties;
      inputs: Record<string, unknown>;
    }> = [];
    const errors: Array<{ workflowId: string; error: string }> = [];

    // Evaluate each workflow's triggers
    for (const { id, workflow } of workflows) {
      if (workflow.definition) {
        const triggers = workflow.definition.triggers || [];
        for (const trigger of triggers) {
          if (trigger.type === eventData.type) {
            try {
              // Use the registered trigger definition's matcher
              // Access `with` property safely since some triggers (like manual) don't have it
              const triggerConfig = 'with' in trigger ? trigger.with : undefined;
              const matchResult = triggerDefinition.matches(triggerConfig, eventData);

              if (matchResult.matches) {
                this.logger.debug(`Workflow ${id} matched trigger ${eventData.type}`);
                matchedWorkflows.push({
                  id,
                  workflow,
                  inputs: matchResult.workflowInputs || {},
                });
                break; // Only match once per workflow
              }
            } catch (error) {
              this.logger.warn(`Error evaluating trigger for workflow ${id}: ${error.message}`);
              errors.push({ workflowId: id, error: error.message });
            }
          }
        }
      }
    }

    this.logger.debug(`${matchedWorkflows.length} workflows matched trigger ${eventData.type}`);

    // Schedule matched workflows
    const scheduledWorkflowIds: string[] = [];

    for (const { id, workflow, inputs } of matchedWorkflows) {
      try {
        const workflowModel: WorkflowExecutionEngineModel = {
          id,
          name: workflow.name,
          enabled: workflow.enabled,
          definition: workflow.definition as WorkflowYaml,
          yaml: workflow.yaml,
        };

        const context = {
          event: eventData.payload,
          spaceId,
          inputs,
          triggeredBy: eventData.type as TriggerType,
        };

        await this.workflowsExecutionEngine.scheduleWorkflow(workflowModel, context, request);
        scheduledWorkflowIds.push(id);
        this.logger.debug(`Scheduled workflow ${id} for trigger ${eventData.type}`);
      } catch (error) {
        this.logger.error(`Failed to schedule workflow ${id}: ${error.message}`);
        errors.push({ workflowId: id, error: error.message });
      }
    }

    return {
      matchedWorkflows: matchedWorkflows.length,
      scheduledWorkflows: scheduledWorkflowIds.length,
      scheduledWorkflowIds,
      errors,
    };
  }

  /**
   * Find all enabled workflows in a space.
   */
  private async findEnabledWorkflows(
    spaceId: string
  ): Promise<Array<{ id: string; workflow: WorkflowProperties }>> {
    if (!this.workflowStorage) {
      throw new Error('TriggerService not initialized');
    }

    const response = await this.workflowStorage.getClient().search({
      query: {
        bool: {
          must: [{ term: { spaceId } }, { term: { enabled: true } }, { term: { valid: true } }],
          must_not: {
            exists: { field: 'deleted_at' },
          },
        },
      },
      size: 10000, // Fetch all enabled workflows
      track_total_hits: false,
    });

    return response.hits.hits.flatMap((hit) => {
      const id = hit._id;
      const source = hit._source;
      if (id && source) {
        return [{ id, workflow: source }];
      }
      return [];
    });
  }
}
