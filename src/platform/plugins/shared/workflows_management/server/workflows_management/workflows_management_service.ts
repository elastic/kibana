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
  SavedObject,
  SavedObjectsClientContract,
  SecurityServiceStart,
} from '@kbn/core/server';
import type {
  CreateWorkflowCommand,
  EsWorkflow,
  EsWorkflowStepExecution,
  UpdatedWorkflowResponseDto,
  WorkflowDetailDto,
  WorkflowExecutionDto,
  WorkflowExecutionHistoryModel,
  WorkflowExecutionListDto,
  WorkflowListDto,
} from '@kbn/workflows';
import type { WorkflowAggsDto, WorkflowStatsDto } from '@kbn/workflows/types/v1';
import { EsWorkflowSchema } from '@kbn/workflows/types/v1';
import { transformWorkflowYamlJsontoEsWorkflow } from '@kbn/workflows';
import type { estypes } from '@elastic/elasticsearch';
import { parseDocument } from 'yaml';
import type { ZodSchema } from '@kbn/zod';
import { parseWorkflowYamlToJSON } from '../../common/lib/yaml_utils';
import { getWorkflowZodSchemaFromConnectorConfig } from '../../common/schema';
import { getAuthenticatedUser } from '../lib/get_user';
import type { WorkflowSavedObjectAttributes } from '../saved_objects/workflow';
import { WORKFLOW_SAVED_OBJECT_TYPE } from '../saved_objects/workflow';
import type { WorkflowTaskScheduler } from '../tasks/workflow_task_scheduler';
import { createOrUpdateIndex } from './lib/create_index';
import { getWorkflowExecution } from './lib/get_workflow_execution';
import {
  WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS,
  WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS,
} from './lib/index_mappings';
import { searchWorkflowExecutions } from './lib/search_workflow_executions';
import type {
  GetExecutionLogsParams,
  GetStepExecutionParams,
  GetStepLogsParams,
  GetWorkflowsParams,
} from './workflows_management_api';
import { searchStepExecutions } from './lib/search_step_executions';
import type { IWorkflowEventLogger, LogSearchResult } from './lib/workflow_logger';
import { SimpleWorkflowLogger } from './lib/workflow_logger';
import type { ConnectorConfig } from '../../common';

const SO_ATTRIBUTES_PREFIX = `${WORKFLOW_SAVED_OBJECT_TYPE}.attributes`;
const WORKFLOW_EXECUTION_STATUS_STATS_BUCKET = 50;

export class WorkflowsService {
  private esClient: ElasticsearchClient | null = null;
  private taskScheduler: WorkflowTaskScheduler | null = null;
  private readonly logger: Logger;
  private readonly getSavedObjectsClient: () => Promise<SavedObjectsClientContract>;
  private readonly workflowsExecutionIndex: string;
  private readonly stepsExecutionIndex: string;
  private workflowEventLoggerService: SimpleWorkflowLogger | null = null;
  private workflowExecutionLogsIndex: string;
  private security?: SecurityServiceStart;

  private connectorConfig: ConnectorConfig | null = null;
  private workflowZodSchemaStrict: ZodSchema | null = null;
  private workflowZodSchemaLoose: ZodSchema | null = null;

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
      createOrUpdateIndex({
        esClient: this.esClient,
        indexName: this.workflowsExecutionIndex,
        mappings: WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS,
        logger: this.logger,
      }),
      createOrUpdateIndex({
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

  public async searchWorkflows(
    params: GetWorkflowsParams,
    spaceId: string
  ): Promise<WorkflowListDto> {
    const { limit, page, query, createdBy, enabled } = params;
    const baseSavedObjectsClient = await this.getSavedObjectsClient();
    const savedObjectsClient = baseSavedObjectsClient.asScopedToNamespace(spaceId);

    const filters: string[] = [`not ${SO_ATTRIBUTES_PREFIX}.deleted_at: *`];

    if (createdBy && createdBy.length > 0) {
      const createdByFilter = createdBy
        .map((user) => `${SO_ATTRIBUTES_PREFIX}.createdBy:"${user}"`)
        .join(' OR ');
      filters.push(`(${createdByFilter})`);
    }

    if (enabled !== undefined && enabled.length > 0) {
      const stateFilter = enabled
        .map((state) => `${SO_ATTRIBUTES_PREFIX}.enabled:"${state}"`)
        .join(' OR ');
      filters.push(`(${stateFilter})`);
    }

    if (query) {
      filters.push(
        `(${SO_ATTRIBUTES_PREFIX}.name:"*${query}*" OR ${SO_ATTRIBUTES_PREFIX}.description:"*${query}*")`
      );
    }

    const filterQuery = filters.join(' AND ');

    const response = await savedObjectsClient.find<WorkflowSavedObjectAttributes>({
      type: WORKFLOW_SAVED_OBJECT_TYPE,
      // Exclude deleted workflows (by checking for null/undefined deleted_at) and workflows from other spaces
      perPage: limit,
      page,
      sortField: 'updated_at',
      sortOrder: 'desc',
      // Exclude deleted workflows by checking for null/undefined deleted_at
      filter: filterQuery || undefined,
    });

    // Get workflow IDs to fetch execution history
    const workflowIds = response.saved_objects.map((so) => so.id);

    // Fetch execution history for all workflows in parallel
    const executionHistoryPromises = workflowIds.map(async (workflowId) => {
      try {
        const executions = await this.searchWorkflowExecutions({ workflowId }, spaceId);
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

    // Create a map for a quick lookup
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
        enabled: so.attributes.enabled,
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
        page,
        limit,
        total: response.total,
      },
    };
  }

  public async getStepExecution(
    params: GetStepExecutionParams,
    spaceId: string
  ): Promise<EsWorkflowStepExecution | null> {
    if (!this.esClient) {
      throw new Error('Elasticsearch client not initialized');
    }
    const stepExecutions = await searchStepExecutions({
      esClient: this.esClient,
      logger: this.logger,
      stepsExecutionIndex: this.stepsExecutionIndex,
      workflowExecutionId: params.executionId,
      additionalQuery: {
        match: {
          stepId: params.stepId,
        },
      },
      spaceId,
    });
    return stepExecutions[0] ?? null;
  }

  public async getWorkflowExecution(
    id: string,
    spaceId: string
  ): Promise<WorkflowExecutionDto | null> {
    if (!this.esClient) {
      throw new Error('Elasticsearch client not initialized');
    }
    return await getWorkflowExecution({
      esClient: this.esClient,
      logger: this.logger,
      workflowExecutionIndex: this.workflowsExecutionIndex,
      stepsExecutionIndex: this.stepsExecutionIndex,
      workflowExecutionId: id,
      spaceId,
    });
  }

  public async getWorkflow(id: string, spaceId: string): Promise<WorkflowDetailDto | null> {
    const baseSavedObjectsClient = await this.getSavedObjectsClient();
    const savedObjectsClient = baseSavedObjectsClient.asScopedToNamespace(spaceId);
    try {
      const response = await savedObjectsClient.get<WorkflowSavedObjectAttributes>(
        WORKFLOW_SAVED_OBJECT_TYPE,
        id
      );

      return {
        id: response.id,
        name: response.attributes.name,
        description: response.attributes.description,
        enabled: response.attributes.enabled,
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
    spaceId: string,
    request: KibanaRequest
  ): Promise<WorkflowDetailDto> {
    const baseSavedObjectsClient = await this.getSavedObjectsClient();
    const savedObjectsClient = baseSavedObjectsClient.asScopedToNamespace(spaceId);
    const parsedYaml = this.parseWorkflowYamlToJSON(workflow.yaml, { loose: true });
    if (!parsedYaml.success) {
      throw new Error('Invalid workflow yaml: ' + parsedYaml.error.message);
    }
    const workflowToCreate = transformWorkflowYamlJsontoEsWorkflow(parsedYaml.data);

    const authenticatedUser = getAuthenticatedUser(request, this.security);
    const savedObjectData: WorkflowSavedObjectAttributes = {
      name: workflowToCreate.name,
      description: workflowToCreate.description,
      enabled: workflowToCreate.enabled,
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
      enabled: response.attributes.enabled,
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
    originalWorkflow: WorkflowDetailDto,
    spaceId: string,
    request: KibanaRequest
  ): Promise<UpdatedWorkflowResponseDto | null> {
    const baseSavedObjectsClient = await this.getSavedObjectsClient();
    const savedObjectsClient = baseSavedObjectsClient.asScopedToNamespace(spaceId);
    const { yaml, definition, ...rest } = workflow;

    try {
      const existed = await savedObjectsClient.get<WorkflowSavedObjectAttributes>(
        WORKFLOW_SAVED_OBJECT_TYPE,
        id
      );
      if (!existed) {
        return null;
      }
    } catch (error) {
      this.logger.error(`Can't read workflow ${id}: ${error}`);
      return null;
    }

    let updateData: Partial<WorkflowSavedObjectAttributes>;

    if (yaml) {
      const parsedYaml = this.parseWorkflowYamlToJSON(yaml, { loose: true });
      if (!parsedYaml.success) {
        throw new Error('Invalid workflow yaml: ' + parsedYaml.error.message);
      }
      const updatedWorkflow = transformWorkflowYamlJsontoEsWorkflow(parsedYaml.data);
      updateData = {
        name: updatedWorkflow.name,
        description: updatedWorkflow.description,
        enabled: updatedWorkflow.enabled,
        tags: updatedWorkflow.tags || [],
        yaml,
        definition: updatedWorkflow.definition,
        lastUpdatedBy: getAuthenticatedUser(request, this.security),
      };

      // Update scheduled tasks if triggers changed
      if (this.taskScheduler && updatedWorkflow.definition?.triggers) {
        // Remove existing scheduled tasks for this workflow
        await this.taskScheduler.unscheduleWorkflowTasks(id);

        // Add new scheduled tasks
        for (const trigger of updatedWorkflow.definition.triggers) {
          if (trigger.type === 'scheduled') {
            await this.taskScheduler.scheduleWorkflowTask(id, 'default', trigger);
          }
        }
      }
    } else {
      const updatedYAML = this.updateYAMLFields(originalWorkflow.yaml, rest);

      updateData = {
        ...rest,
        lastUpdatedBy: getAuthenticatedUser(request, this.security),
        yaml: updatedYAML,
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

  public updateYAMLFields(yaml: string, fields: Record<string, any>) {
    const doc = parseDocument(yaml);

    Object.entries(fields).forEach(([key, value]) => {
      if (doc.hasIn([key])) {
        const currentValue: any = doc.getIn([key as string]);
        if (currentValue !== value) {
          doc.setIn([key], value);
        }
      }
    });

    return doc.toString();
  }

  public async deleteWorkflows(
    workflowIds: string[],
    spaceId: string,
    request: KibanaRequest
  ): Promise<void> {
    const baseSavedObjectsClient = await this.getSavedObjectsClient();
    const savedObjectsClient = baseSavedObjectsClient.asScopedToNamespace(spaceId);

    const savedObjects = await savedObjectsClient.bulkGet<WorkflowSavedObjectAttributes>(
      workflowIds.map((id) => ({
        type: WORKFLOW_SAVED_OBJECT_TYPE,
        id,
      }))
    );

    const existedWorkflows: Array<SavedObject<WorkflowSavedObjectAttributes>> =
      savedObjects.saved_objects;

    // Remove tasks scheduled for deleted workflows
    if (this.taskScheduler) {
      for (const workflow of existedWorkflows) {
        await this.taskScheduler.unscheduleWorkflowTasks(workflow.id);
      }
    }

    // Soft delete workflows by setting deleted_at timestamp instead of removing them
    const authenticatedUser = getAuthenticatedUser(request, this.security);
    const deletedAt = new Date();
    await Promise.all(
      existedWorkflows.map((workflow) =>
        savedObjectsClient.update<WorkflowSavedObjectAttributes>(
          WORKFLOW_SAVED_OBJECT_TYPE,
          workflow.id,
          {
            deleted_at: deletedAt,
            lastUpdatedBy: authenticatedUser,
          }
        )
      )
    );
  }

  public async searchWorkflowExecutions(
    params: {
      workflowId: string;
    },
    spaceId: string
  ): Promise<WorkflowExecutionListDto> {
    if (!this.esClient) {
      throw new Error('Elasticsearch client not initialized');
    }

    return await searchWorkflowExecutions({
      esClient: this.esClient,
      logger: this.logger,
      workflowExecutionIndex: this.workflowsExecutionIndex,
      query: {
        bool: {
          must: [
            { term: { workflowId: params.workflowId } },
            {
              bool: {
                should: [
                  { term: { spaceId } },
                  // Backward compatibility for objects without spaceId
                  { bool: { must_not: { exists: { field: 'spaceId' } } } },
                ],
                minimum_should_match: 1,
              },
            },
          ],
        },
      },
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
  private async searchWorkflowLogs(
    query: estypes.QueryDslQueryContainer,
    sortOrder: estypes.SortOrder = 'desc'
  ): Promise<LogSearchResult> {
    if (!this.esClient) {
      throw new Error('Elasticsearch client not initialized');
    }

    try {
      const response = await this.esClient.search({
        index: this.workflowExecutionLogsIndex,
        query,
        sort: [{ '@timestamp': { order: sortOrder } }],
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

  public async getExecutionLogs(
    params: GetExecutionLogsParams,
    spaceId: string
  ): Promise<LogSearchResult> {
    const query = {
      bool: {
        must: [
          {
            match: {
              'workflow.execution_id': params.executionId,
            },
          },
          {
            bool: {
              should: [
                { term: { spaceId } },
                // Backward compatibility for objects without spaceId
                { bool: { must_not: { exists: { field: 'spaceId' } } } },
              ],
              minimum_should_match: 1,
            },
          },
        ],
      },
    };

    return this.searchWorkflowLogs(query, params.sortOrder);
  }

  public async getStepLogs(params: GetStepLogsParams, spaceId: string): Promise<LogSearchResult> {
    const query = {
      bool: {
        must: [
          {
            match: {
              'workflow.execution_id': params.executionId,
            },
          },
          {
            match: {
              'workflow.step_id.keyword': params.stepId,
            },
          },
          {
            bool: {
              should: [
                { term: { spaceId } },
                // Backward compatibility for objects without spaceId
                { bool: { must_not: { exists: { field: 'spaceId' } } } },
              ],
              minimum_should_match: 1,
            },
          },
        ],
      },
    };

    return this.searchWorkflowLogs(query, params.sortOrder);
  }

  public async getWorkflowStats(spaceId: string): Promise<WorkflowStatsDto | null> {
    const baseSavedObjectsClient = await this.getSavedObjectsClient();
    const savedObjectsClient = baseSavedObjectsClient.asScopedToNamespace(spaceId);
    try {
      const [workflowStatusStats, workflowExecutionStatusStats] = await Promise.all([
        this.getWorkflowStatusStats(savedObjectsClient),
        this.getWorkflowExecutionStatusStats(spaceId),
      ]);

      return {
        workflows: {
          enabled: workflowStatusStats.enabled,
          disabled: workflowStatusStats.disabled,
        },
        executions: workflowExecutionStatusStats,
      };
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  public async getWorkflowAggs(fields: string[], spaceId: string): Promise<WorkflowAggsDto | null> {
    const baseSavedObjectsClient = await this.getSavedObjectsClient();
    const savedObjectsClient = baseSavedObjectsClient.asScopedToNamespace(spaceId);
    try {
      const aggs = fields.reduce<Record<string, object>>((acc, field) => {
        acc[field] = {
          terms: {
            field: `${WORKFLOW_SAVED_OBJECT_TYPE}.attributes.${field}`,
            size: 100,
          },
        };
        return acc;
      }, {});

      const response = await savedObjectsClient.find({
        type: WORKFLOW_SAVED_OBJECT_TYPE,
        perPage: 0,
        aggs,
      });

      const aggregations = response.aggregations as any;

      type Keys = keyof typeof EsWorkflowSchema.shape; // "id" | "name" | ...
      function fieldKind<K extends Keys>(key: K): string {
        return EsWorkflowSchema.shape[key]._def.typeName;
      }

      return fields.reduce<WorkflowAggsDto>((acc, field) => {
        acc[field] = aggregations[field].buckets.map(
          ({ key }: { key: string | boolean | number }) => {
            const typeName = fieldKind(field as Keys);
            let label: string;
            if (typeName === 'ZodBoolean') {
              label = key ? 'Enabled' : 'Disabled';
              key = Boolean(key);
            } else if (typeName === 'ZodNumber') {
              label = key.toString();
            } else {
              label = key.toString().charAt(0).toUpperCase() + key.toString().slice(1);
            }
            return {
              key,
              label,
            };
          }
        );
        return acc;
      }, {});
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  private async getWorkflowStatusStats(savedObjectsClient: SavedObjectsClientContract) {
    const aggs: Record<string, estypes.AggregationsAggregationContainer> = {
      by_enabled: {
        terms: {
          field: 'workflow.attributes.enabled',
        },
      },
    };

    const response = await savedObjectsClient.find<WorkflowSavedObjectAttributes>({
      type: WORKFLOW_SAVED_OBJECT_TYPE,
      perPage: 0, // we only want aggregations, no hits

      // workflow SO does not have createdAt in mappings =(
      // filter: `workflow.attributes.createdAt >= "now-30d/d" and workflow.attributes.createdAt <= "now/d"`,
      aggs,
    });

    const { by_enabled: byEnabled } = response.aggregations as any;

    return byEnabled.buckets.reduce(
      (
        acc: Record<string, number>,
        { key, doc_count: count }: { key: string; doc_count: number }
      ) => {
        acc[key] = count;
        return acc;
      },
      {} as Record<string, number>
    );
  }

  private async getWorkflowExecutionStatusStats(spaceId: string) {
    if (!this.esClient) {
      throw new Error('Elasticsearch client not initialized');
    }

    const query: estypes.SearchRequest = {
      index: this.workflowsExecutionIndex,
      size: 0, // no hits, just aggregations
      query: {
        bool: {
          filter: [
            { term: { spaceId } },
            {
              range: {
                startedAt: {
                  gte: 'now-30d/d',
                  lt: 'now+1d/d',
                },
              },
            },
          ],
        },
      },
      aggs: {
        by_time: {
          auto_date_histogram: {
            field: 'finishedAt',
            buckets: WORKFLOW_EXECUTION_STATUS_STATS_BUCKET,
          },
          aggs: {
            by_status: {
              terms: {
                field: 'status',
              },
            },
          },
        },
      },
    };

    const response = await this.esClient.search(query);
    const { by_time: byTime } = response.aggregations as any;

    return byTime.buckets.map((interval: any) => {
      // Default values
      let completed = 0;
      let failed = 0;
      let cancelled = 0;

      for (const statusBucket of interval.by_status.buckets) {
        switch (statusBucket.key) {
          case 'completed':
            completed = statusBucket.doc_count;
            break;
          case 'failed':
            failed = statusBucket.doc_count;
            break;
          case 'cancelled':
            cancelled = statusBucket.doc_count;
            break;
        }
      }

      return {
        date: interval.key_as_string,
        timestamp: interval.key,
        completed,
        failed,
        cancelled,
      };
    });
  }

  public setConnectorConfig(connectorConfig: {
    types: string[];
    nameMap: Record<string, string[]>;
  }) {
    this.connectorConfig = connectorConfig;
    // Generate zod schemas for validation
    this.workflowZodSchemaStrict = getWorkflowZodSchemaFromConnectorConfig(connectorConfig, false);
    this.workflowZodSchemaLoose = getWorkflowZodSchemaFromConnectorConfig(connectorConfig, true);
  }

  public getConnectorConfig() {
    return this.connectorConfig;
  }

  public parseWorkflowYamlToJSON(yaml: string, { loose }: { loose: boolean }) {
    if (loose) {
      if (!this.workflowZodSchemaLoose) {
        throw new Error('Loose workflow zod schema not initialized');
      }
      return parseWorkflowYamlToJSON(yaml, this.workflowZodSchemaLoose);
    }
    if (!this.workflowZodSchemaStrict) {
      throw new Error('Strict workflow zod schema not initialized');
    }
    return parseWorkflowYamlToJSON(yaml, this.workflowZodSchemaStrict);
  }
}
