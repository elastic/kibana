/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ElasticsearchClient,
  KibanaRequest,
  Logger,
  SavedObjectsClientContract,
  SecurityServiceStart,
} from '@kbn/core/server';
import type {
  CreateWorkflowCommand,
  EsWorkflow,
  UpdatedWorkflowResponseDto,
  WorkflowDetailDto,
  WorkflowExecutionDto,
  WorkflowExecutionHistoryModel,
  WorkflowExecutionListDto,
  WorkflowListDto,
} from '@kbn/workflows';
import { transformWorkflowYamlJsontoEsWorkflow } from '@kbn/workflows';
import { parseWorkflowYamlToJSON } from '../../common/lib/yaml_utils';
import { WORKFLOW_ZOD_SCHEMA_LOOSE } from '../../common/schema';
import { getAuthenticatedUser } from '../lib/get_user';
import type { WorkflowSavedObjectAttributes } from '../saved_objects/workflow';
import { WORKFLOW_SAVED_OBJECT_TYPE } from '../saved_objects/workflow';
import type { WorkflowTaskScheduler } from '../tasks/workflow_task_scheduler';
import { createIndexWithMappings } from './lib/create_index';
import { getWorkflowExecution } from './lib/get_workflow_execution';
import {
  WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS,
  WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS,
} from './lib/index_mappings';
import { searchWorkflowExecutions } from './lib/search_workflow_executions';
import type { IWorkflowEventLogger, LogSearchResult } from './lib/workflow_logger';
import { SimpleWorkflowLogger } from './lib/workflow_logger';
import type { GetWorkflowsParams } from './workflows_management_api';

export class WorkflowsService {
  private esClient: ElasticsearchClient | null = null;
  private taskScheduler: WorkflowTaskScheduler | null = null;
  private logger: Logger;
  private getSavedObjectsClient: () => Promise<SavedObjectsClientContract>;
  private workflowsExecutionIndex: string;
  private stepsExecutionIndex: string;
  private workflowEventLoggerService: SimpleWorkflowLogger | null = null;
  private workflowExecutionLogsIndex: string;
  private security?: SecurityServiceStart;

  constructor(
    esClientPromise: Promise<ElasticsearchClient>,
    logger: Logger,
    getSavedObjectsClient: () => Promise<SavedObjectsClientContract>,
    workflowsExecutionIndex: string,
    stepsExecutionIndex: string,
    workflowExecutionLogsIndex: string,
    enableConsoleLogging: boolean = false
  ) {
    this.logger = logger;
    this.getSavedObjectsClient = getSavedObjectsClient;
    this.stepsExecutionIndex = stepsExecutionIndex;
    this.workflowsExecutionIndex = workflowsExecutionIndex;
    this.workflowExecutionLogsIndex = workflowExecutionLogsIndex;
    void this.initialize(esClientPromise, workflowExecutionLogsIndex, enableConsoleLogging);
  }

  public setTaskScheduler(taskScheduler: WorkflowTaskScheduler) {
    this.taskScheduler = taskScheduler;
  }

  public setSecurityService(security: SecurityServiceStart) {
    this.security = security;
  }

  private async initialize(
    esClientPromise: Promise<ElasticsearchClient>,
    workflowExecutionLogsIndex: string,
    enableConsoleLogging: boolean = false
  ) {
    this.esClient = await esClientPromise;
    this.logger.debug('Elasticsearch client initialized');

    // Initialize simple workflow logger
    this.workflowEventLoggerService = new SimpleWorkflowLogger(this.logger, enableConsoleLogging);

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
      // Exclude deleted workflows by checking for null/undefined deleted_at
      filter: `not ${WORKFLOW_SAVED_OBJECT_TYPE}.attributes.deleted_at: *`,
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
        definition: response.attributes.definition,
        yaml: response.attributes.yaml,
      };
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  public async createWorkflow(
    workflow: CreateWorkflowCommand,
    request: KibanaRequest
  ): Promise<WorkflowDetailDto> {
    const savedObjectsClient = await this.getSavedObjectsClient();
    const parsedYaml = parseWorkflowYamlToJSON(workflow.yaml, WORKFLOW_ZOD_SCHEMA_LOOSE);
    if (!parsedYaml.success) {
      throw new Error('Invalid workflow yaml: ' + parsedYaml.error.message);
    }
    // @ts-expect-error - TODO: fix this
    const workflowToCreate = transformWorkflowYamlJsontoEsWorkflow(parsedYaml.data);

    const authenticatedUser = getAuthenticatedUser(request, this.security);
    const savedObjectData: WorkflowSavedObjectAttributes = {
      name: workflowToCreate.name,
      description: workflowToCreate.description,
      status: workflowToCreate.status,
      tags: workflowToCreate.tags || [],
      yaml: workflow.yaml,
      definition: workflowToCreate.definition,
      createdBy: authenticatedUser,
      lastUpdatedBy: authenticatedUser,
      deleted_at: null,
    };

    const response = await savedObjectsClient.create<WorkflowSavedObjectAttributes>(
      WORKFLOW_SAVED_OBJECT_TYPE,
      savedObjectData
    );

    // Schedule the workflow if it has triggers
    if (this.taskScheduler && workflowToCreate.definition.triggers) {
      for (const trigger of workflowToCreate.definition.triggers) {
        if (trigger.type === 'scheduled' && trigger.enabled) {
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
    workflow: Partial<EsWorkflow>,
    request: KibanaRequest
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
        lastUpdatedBy: getAuthenticatedUser(request, this.security),
      };

      // Update scheduled tasks if triggers changed
      if (this.taskScheduler && updatedWorkflow.definition?.workflow?.triggers) {
        // Remove existing scheduled tasks for this workflow
        await this.taskScheduler.unscheduleWorkflowTasks(id);

        // Add new scheduled tasks
        for (const trigger of updatedWorkflow.definition.workflow.triggers) {
          if (trigger.type === 'scheduled') {
            await this.taskScheduler.scheduleWorkflowTask(id, 'default', trigger);
          }
        }
      }
    } else {
      updateData = {
        ...rest,
        lastUpdatedBy: getAuthenticatedUser(request, this.security),
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

  public async deleteWorkflows(workflowIds: string[], request: KibanaRequest): Promise<void> {
    const savedObjectsClient = await this.getSavedObjectsClient();

    // Remove scheduled tasks for deleted workflows
    if (this.taskScheduler) {
      for (const workflowId of workflowIds) {
        await this.taskScheduler.unscheduleWorkflowTasks(workflowId);
      }
    }

    // Soft delete workflows by setting deleted_at timestamp instead of removing them
    const authenticatedUser = getAuthenticatedUser(request, this.security);
    const deletedAt = new Date();
    await Promise.all(
      workflowIds.map((id) =>
        savedObjectsClient.update<WorkflowSavedObjectAttributes>(WORKFLOW_SAVED_OBJECT_TYPE, id, {
          deleted_at: deletedAt,
          lastUpdatedBy: authenticatedUser,
        })
      )
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
    return this.workflowEventLoggerService;
  }

  public getExecutionLogger(
    workflowId: string,
    executionId: string,
    workflowName?: string
  ): IWorkflowEventLogger {
    if (!this.workflowEventLoggerService) {
      throw new Error('Workflow event logger service not initialized');
    }
    return this.workflowEventLoggerService;
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
    return this.workflowEventLoggerService;
  }

  // Direct log search methods - query ES logs index directly
  private async searchWorkflowLogs(query: any): Promise<LogSearchResult> {
    if (!this.esClient) {
      throw new Error('Elasticsearch client not initialized');
    }

    try {
      const response = await this.esClient.search({
        index: this.workflowExecutionLogsIndex,
        query,
        sort: [{ '@timestamp': { order: 'desc' } }],
        size: 1000,
      });

      return {
        total:
          typeof response.hits.total === 'number'
            ? response.hits.total
            : response.hits.total?.value || 0,
        logs: response.hits.hits
          .map((hit: any) => hit._source)
          .filter((source: any) => source && source['@timestamp']), // Filter out invalid entries
      };
    } catch (error) {
      this.logger.error('Failed to search workflow logs', error);
      // Return empty result instead of throwing - logs might not exist yet
      return {
        total: 0,
        logs: [],
      };
    }
  }

  public async getExecutionLogs(executionId: string): Promise<LogSearchResult> {
    const query = {
      bool: {
        must: [
          {
            match: {
              'workflow.execution_id': executionId,
            },
          },
        ],
      },
    };

    return this.searchWorkflowLogs(query);
  }

  public async getStepLogs(executionId: string, stepId: string): Promise<LogSearchResult> {
    const query = {
      bool: {
        must: [
          {
            match: {
              'workflow.execution_id': executionId,
            },
          },
          {
            match: {
              'workflow.step_id': stepId,
            },
          },
        ],
      },
    };

    return this.searchWorkflowLogs(query);
  }

  public async getWorkflowLogs(workflowId: string): Promise<LogSearchResult> {
    const query = {
      bool: {
        must: [
          {
            term: {
              'workflow.id': workflowId,
            },
          },
        ],
      },
    };

    return this.searchWorkflowLogs(query);
  }
}
