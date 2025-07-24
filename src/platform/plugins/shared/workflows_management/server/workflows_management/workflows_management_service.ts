/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import {
  CreateWorkflowCommand,
  EsWorkflow,
  transformWorkflowYamlJsontoEsWorkflow,
  UpdatedWorkflowResponseDto,
  WorkflowDetailDto,
  WorkflowExecutionDto,
  WorkflowExecutionHistoryModel,
  WorkflowExecutionListDto,
  WorkflowListDto,
} from '@kbn/workflows';
import { WORKFLOW_ZOD_SCHEMA_LOOSE } from '../../common';
import { parseWorkflowYamlToJSON } from '../../common/lib/yaml-utils';
import {
  WORKFLOW_SAVED_OBJECT_TYPE,
  WorkflowSavedObjectAttributes,
} from '../saved_objects/workflow';
import type { WorkflowTaskScheduler } from '../tasks/workflow_task_scheduler';
import { WorkflowEventLoggerService, type IWorkflowEventLogger } from '../workflow_event_logger';
import { createIndexWithMappings } from './lib/create_index';
import { getWorkflowExecution } from './lib/get_workflow_execution';
import {
  WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS,
  WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS,
} from './lib/index_mappings';
import { searchWorkflowExecutions } from './lib/search_workflow_executions';
import { GetWorkflowsParams } from './workflows_management_api';

export class WorkflowsService {
  private esClient: ElasticsearchClient | null = null;
  private taskScheduler: WorkflowTaskScheduler | null = null;
  private logger: Logger;
  private getSavedObjectsClient: () => Promise<SavedObjectsClientContract>;
  private workflowsExecutionIndex: string;
  private stepsExecutionIndex: string;
  private workflowEventLoggerService: WorkflowEventLoggerService | null = null;

  constructor(
    esClientPromise: Promise<ElasticsearchClient>,
    logger: Logger,
    getSavedObjectsClient: () => Promise<SavedObjectsClientContract>,
    workflowsExecutionIndex: string,
    stepsExecutionIndex: string,
    workflowExecutionLogsIndex: string
  ) {
    this.logger = logger;
    this.getSavedObjectsClient = getSavedObjectsClient;
    this.stepsExecutionIndex = stepsExecutionIndex;
    this.workflowsExecutionIndex = workflowsExecutionIndex;
    void this.initialize(esClientPromise, workflowExecutionLogsIndex);
  }

  public setTaskScheduler(taskScheduler: WorkflowTaskScheduler) {
    this.taskScheduler = taskScheduler;
  }

  private async initialize(
    esClientPromise: Promise<ElasticsearchClient>,
    workflowExecutionLogsIndex: string
  ) {
    this.esClient = await esClientPromise;
    this.logger.debug('Elasticsearch client initialized');

    // Initialize workflow event logger service
    this.workflowEventLoggerService = new WorkflowEventLoggerService({
      esClient: this.esClient,
      logger: this.logger,
      indexName: workflowExecutionLogsIndex,
    });
    await this.workflowEventLoggerService.initialize();

    // Create required indices with proper mappings (workflows are now saved objects)
    await Promise.all([
      createIndexWithMappings({
        esClient: this.esClient,
        indexName: this.workflowsExecutionIndex,
        mappings: WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS,
        logger: this.logger,
      }),
      createIndexWithMappings({
        esClient: this.esClient,
        indexName: this.stepsExecutionIndex,
        mappings: WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS,
        logger: this.logger,
      }),
    ]);

    this.logger.debug(
      'Workflow execution indices and event logger initialized with proper mappings'
    );
  }

  public async searchWorkflows(params: GetWorkflowsParams): Promise<WorkflowListDto> {
    const savedObjectsClient = await this.getSavedObjectsClient();
    const response = await savedObjectsClient.find<WorkflowSavedObjectAttributes>({
      type: WORKFLOW_SAVED_OBJECT_TYPE,
      perPage: 100,
      sortField: 'updated_at',
      sortOrder: 'desc',
    });

    // Get workflow IDs to fetch execution history
    const workflowIds = response.saved_objects.map((so) => so.id);

    // Fetch execution history for all workflows in parallel
    const executionHistoryPromises = workflowIds.map(async (workflowId) => {
      try {
        const executions = await this.searchWorkflowExecutions({ workflowId });
        return {
          workflowId,
          history: executions.results.map((execution) => ({
            id: execution.id,
            workflowId: execution.workflowId,
            workflowName: '', // Will be filled from workflow data
            status: execution.status,
            startedAt: execution.startedAt,
            finishedAt: execution.finishedAt,
            duration: execution.duration,
          })),
        };
      } catch (error) {
        this.logger.warn(`Failed to fetch execution history for workflow ${workflowId}: ${error}`);
        return {
          workflowId,
          history: [],
        };
      }
    });

    const executionHistoryResults = await Promise.all(executionHistoryPromises);

    // Create a map for quick lookup
    const historyByWorkflowId = executionHistoryResults.reduce((acc, result) => {
      acc[result.workflowId] = result.history;
      return acc;
    }, {} as Record<string, WorkflowExecutionHistoryModel[]>);

    const results = response.saved_objects.map((so) => {
      const workflowName = so.attributes.name;
      const workflowHistory = historyByWorkflowId[so.id] || [];

      // Update workflowName in history items
      const historyWithWorkflowName = workflowHistory.map(
        (historyItem: WorkflowExecutionHistoryModel) => ({
          ...historyItem,
          workflowName,
        })
      );

      return {
        id: so.id,
        name: so.attributes.name,
        description: so.attributes.description || '',
        status: so.attributes.status,
        tags: so.attributes.tags,
        createdAt: new Date(so.created_at!),
        createdBy: so.attributes.createdBy,
        lastUpdatedAt: new Date(so.updated_at!),
        lastUpdatedBy: so.attributes.lastUpdatedBy,
        definition: so.attributes.definition as any,
        history: historyWithWorkflowName,
      };
    });

    return {
      results,
      _pagination: {
        offset: 0,
        limit: 100,
        total: response.total,
      },
    };
  }

  public async getWorkflowExecution(id: string): Promise<WorkflowExecutionDto | null> {
    if (!this.esClient) {
      throw new Error('Elasticsearch client not initialized');
    }
    return await getWorkflowExecution({
      esClient: this.esClient,
      logger: this.logger,
      workflowExecutionIndex: this.workflowsExecutionIndex,
      stepsExecutionIndex: this.stepsExecutionIndex,
      workflowExecutionId: id,
    });
  }

  public async getWorkflow(id: string): Promise<WorkflowDetailDto | null> {
    const savedObjectsClient = await this.getSavedObjectsClient();
    try {
      const response = await savedObjectsClient.get<WorkflowSavedObjectAttributes>(
        WORKFLOW_SAVED_OBJECT_TYPE,
        id
      );

      return {
        id: response.id,
        name: response.attributes.name,
        description: response.attributes.description,
        status: response.attributes.status,
        createdAt: new Date(response.created_at!),
        createdBy: response.attributes.createdBy,
        lastUpdatedAt: new Date(response.updated_at!),
        lastUpdatedBy: response.attributes.lastUpdatedBy,
        definition: response.attributes.definition as any,
        yaml: response.attributes.yaml,
      };
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  public async createWorkflow(workflow: CreateWorkflowCommand): Promise<WorkflowDetailDto> {
    const savedObjectsClient = await this.getSavedObjectsClient();
    const parsedYaml = parseWorkflowYamlToJSON(workflow.yaml, WORKFLOW_ZOD_SCHEMA_LOOSE);
    if (!parsedYaml.success) {
      throw new Error('Invalid workflow yaml: ' + parsedYaml.error.message);
    }
    // @ts-expect-error - TODO: fix this
    const workflowToCreate = transformWorkflowYamlJsontoEsWorkflow(parsedYaml.data);

    const savedObjectData: WorkflowSavedObjectAttributes = {
      name: workflowToCreate.name,
      description: workflowToCreate.description,
      status: workflowToCreate.status,
      tags: workflowToCreate.tags || [],
      yaml: workflow.yaml,
      definition: workflowToCreate.definition,
      createdBy: 'system', // TODO: get from context
      lastUpdatedBy: 'system', // TODO: get from context
    };

    const response = await savedObjectsClient.create<WorkflowSavedObjectAttributes>(
      WORKFLOW_SAVED_OBJECT_TYPE,
      savedObjectData
    );

    // Schedule the workflow if it has triggers
    if (this.taskScheduler && workflowToCreate.definition.workflow.triggers) {
      for (const trigger of workflowToCreate.definition.workflow.triggers) {
        if (trigger.type === 'triggers.elastic.scheduled' && trigger.enabled) {
          await this.taskScheduler.scheduleWorkflowTask(response.id, 'default', trigger);
        }
      }
    }

    return {
      id: response.id,
      name: response.attributes.name,
      description: response.attributes.description,
      status: response.attributes.status,
      createdAt: new Date(response.created_at!),
      createdBy: response.attributes.createdBy,
      lastUpdatedAt: new Date(response.updated_at!),
      lastUpdatedBy: response.attributes.lastUpdatedBy,
      definition: response.attributes.definition,
      yaml: response.attributes.yaml,
    };
  }

  public async updateWorkflow(
    id: string,
    workflow: Partial<EsWorkflow>
  ): Promise<UpdatedWorkflowResponseDto> {
    const savedObjectsClient = await this.getSavedObjectsClient();
    const { yaml, definition, ...rest } = workflow;

    let updateData: Partial<WorkflowSavedObjectAttributes>;

    if (yaml) {
      const parsedYaml = parseWorkflowYamlToJSON(yaml, WORKFLOW_ZOD_SCHEMA_LOOSE);
      if (!parsedYaml.success) {
        throw new Error('Invalid workflow yaml: ' + parsedYaml.error.message);
      }
      // @ts-expect-error - TODO: fix this
      const updatedWorkflow = transformWorkflowYamlJsontoEsWorkflow(parsedYaml.data) as any;
      updateData = {
        name: updatedWorkflow.name,
        description: updatedWorkflow.description,
        status: updatedWorkflow.status,
        tags: updatedWorkflow.tags || [],
        yaml,
        definition: updatedWorkflow.definition,
        lastUpdatedBy: 'system', // TODO: get from context
      };

      // Update scheduled tasks if triggers changed
      if (this.taskScheduler && updatedWorkflow.definition?.workflow?.triggers) {
        // Remove existing scheduled tasks for this workflow
        await this.taskScheduler.unscheduleWorkflowTasks(id);

        // Add new scheduled tasks
        for (const trigger of updatedWorkflow.definition.workflow.triggers) {
          if (trigger.type === 'triggers.elastic.scheduled') {
            await this.taskScheduler.scheduleWorkflowTask(id, 'default', trigger);
          }
        }
      }
    } else {
      updateData = {
        ...rest,
        lastUpdatedBy: 'system', // TODO: get from context
      };
    }

    const response = await savedObjectsClient.update<WorkflowSavedObjectAttributes>(
      WORKFLOW_SAVED_OBJECT_TYPE,
      id,
      updateData
    );

    return {
      id: response.id,
      lastUpdatedAt: new Date(response.updated_at!),
      lastUpdatedBy: response.attributes.lastUpdatedBy,
    };
  }

  public async deleteWorkflows(workflowIds: string[]): Promise<void> {
    const savedObjectsClient = await this.getSavedObjectsClient();

    // Remove scheduled tasks for deleted workflows
    if (this.taskScheduler) {
      for (const workflowId of workflowIds) {
        await this.taskScheduler.unscheduleWorkflowTasks(workflowId);
      }
    }

    await Promise.all(
      workflowIds.map((id) => savedObjectsClient.delete(WORKFLOW_SAVED_OBJECT_TYPE, id))
    );
  }

  public async searchWorkflowExecutions(params: {
    workflowId: string;
  }): Promise<WorkflowExecutionListDto> {
    if (!this.esClient) {
      throw new Error('Elasticsearch client not initialized');
    }
    return await searchWorkflowExecutions({
      esClient: this.esClient,
      logger: this.logger,
      workflowExecutionIndex: this.workflowsExecutionIndex,
      query: { match: { workflowId: params.workflowId } },
    });
  }

  // Workflow Event Logger methods
  public getWorkflowLogger(workflowId: string, workflowName?: string): IWorkflowEventLogger {
    if (!this.workflowEventLoggerService) {
      throw new Error('Workflow event logger service not initialized');
    }
    return this.workflowEventLoggerService.createWorkflowLogger(workflowId, workflowName);
  }

  public getExecutionLogger(
    workflowId: string,
    executionId: string,
    workflowName?: string
  ): IWorkflowEventLogger {
    if (!this.workflowEventLoggerService) {
      throw new Error('Workflow event logger service not initialized');
    }
    return this.workflowEventLoggerService.createExecutionLogger(
      workflowId,
      executionId,
      workflowName
    );
  }

  public getStepLogger(
    workflowId: string,
    executionId: string,
    stepId: string,
    stepName?: string,
    stepType?: string,
    workflowName?: string
  ): IWorkflowEventLogger {
    if (!this.workflowEventLoggerService) {
      throw new Error('Workflow event logger service not initialized');
    }
    return this.workflowEventLoggerService.createStepLogger(
      workflowId,
      executionId,
      stepId,
      stepName,
      stepType,
      workflowName
    );
  }

  public async getExecutionLogs(executionId: string) {
    if (!this.workflowEventLoggerService) {
      throw new Error('Workflow event logger service not initialized');
    }
    return this.workflowEventLoggerService.getExecutionLogs(executionId);
  }

  public async getStepLogs(executionId: string, stepId: string) {
    if (!this.workflowEventLoggerService) {
      throw new Error('Workflow event logger service not initialized');
    }
    return this.workflowEventLoggerService.getStepLogs(executionId, stepId);
  }
}
