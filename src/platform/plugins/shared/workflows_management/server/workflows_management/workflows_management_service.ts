/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import type {
  ElasticsearchClient,
  KibanaRequest,
  Logger,
  SecurityServiceStart,
} from '@kbn/core/server';
import type {
  CreateWorkflowCommand,
  EsWorkflow,
  EsWorkflowExecution,
  EsWorkflowStepExecution,
  UpdatedWorkflowResponseDto,
  WorkflowDetailDto,
  WorkflowExecutionDto,
  WorkflowExecutionHistoryModel,
  WorkflowExecutionListDto,
  WorkflowListDto,
  WorkflowYaml,
} from '@kbn/workflows';
import { transformWorkflowYamlJsontoEsWorkflow } from '@kbn/workflows';
import type {
  ExecutionStatus,
  ExecutionType,
  WorkflowAggsDto,
  WorkflowStatsDto,
} from '@kbn/workflows/types/v1';
import { v4 as generateUuid } from 'uuid';
import { InvalidYamlSchemaError, WorkflowValidationError } from '../../common/lib/errors';
import { validateStepNameUniqueness } from '../../common/lib/validate_step_names';

import { parseWorkflowYamlToJSON, stringifyWorkflowDefinition } from '../../common/lib/yaml_utils';
import { getWorkflowZodSchema, getWorkflowZodSchemaLoose } from '../../common/schema';
import { getAuthenticatedUser } from '../lib/get_user';
import { hasScheduledTriggers } from '../lib/schedule_utils';
import type { WorkflowProperties, WorkflowStorage } from '../storage/workflow_storage';
import { createStorage } from '../storage/workflow_storage';
import type { WorkflowTaskScheduler } from '../tasks/workflow_task_scheduler';
import { createOrUpdateIndex } from './lib/create_index';
import { getWorkflowExecution } from './lib/get_workflow_execution';
import {
  WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS,
  WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS,
} from './lib/index_mappings';
import { searchStepExecutions } from './lib/search_step_executions';
import { searchWorkflowExecutions } from './lib/search_workflow_executions';
import type { IWorkflowEventLogger, LogSearchResult } from './lib/workflow_logger';
import { SimpleWorkflowLogger } from './lib/workflow_logger';
import type {
  GetExecutionLogsParams,
  GetStepExecutionParams,
  GetStepLogsParams,
  GetWorkflowsParams,
} from './workflows_management_api';

export interface SearchWorkflowExecutionsParams {
  workflowId: string;
  statuses?: ExecutionStatus[];
  executionTypes?: ExecutionType[];
}

export class WorkflowsService {
  private esClient: ElasticsearchClient | null = null;
  private workflowStorage: WorkflowStorage | null = null;
  private taskScheduler: WorkflowTaskScheduler | null = null;
  private readonly logger: Logger;
  private readonly workflowsExecutionIndex: string;
  private readonly stepsExecutionIndex: string;
  private workflowEventLoggerService: SimpleWorkflowLogger | null = null;
  private security?: SecurityServiceStart;

  constructor(
    esClientPromise: Promise<ElasticsearchClient>,
    logger: Logger,
    workflowsExecutionIndex: string,
    stepsExecutionIndex: string,
    workflowExecutionLogsIndex: string,
    enableConsoleLogging: boolean = false
  ) {
    this.logger = logger;
    this.stepsExecutionIndex = stepsExecutionIndex;
    this.workflowsExecutionIndex = workflowsExecutionIndex;
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

    // Initialize workflow storage
    this.workflowStorage = createStorage({
      logger: this.logger,
      esClient: this.esClient,
    });

    this.workflowEventLoggerService = new SimpleWorkflowLogger(
      this.logger,
      this.esClient,
      workflowExecutionLogsIndex,
      enableConsoleLogging
    );

    // Create execution indices
    await createOrUpdateIndex({
      esClient: this.esClient,
      indexName: this.workflowsExecutionIndex,
      mappings: WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS,
      logger: this.logger,
    });
    await createOrUpdateIndex({
      esClient: this.esClient,
      indexName: this.stepsExecutionIndex,
      mappings: WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS,
      logger: this.logger,
    });
  }

  public async getWorkflow(id: string, spaceId: string): Promise<WorkflowDetailDto | null> {
    if (!this.workflowStorage) {
      throw new Error('WorkflowsService not initialized');
    }

    try {
      const response = await this.workflowStorage.getClient().search({
        query: {
          bool: {
            must: [{ ids: { values: [id] } }, { term: { spaceId } }],
          },
        },
        size: 1,
        track_total_hits: false,
      });

      if (response.hits.hits.length === 0) {
        return null;
      }

      const document = response.hits.hits[0];
      return this.transformStorageDocumentToWorkflowDto(document._id!, document._source!);
    } catch (error) {
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
    if (!this.workflowStorage) {
      throw new Error('WorkflowsService not initialized');
    }

    const parsedYaml = parseWorkflowYamlToJSON(workflow.yaml, getWorkflowZodSchemaLoose());
    if (!parsedYaml.success) {
      throw new Error('Invalid workflow yaml: ' + parsedYaml.error.message);
    }

    // Validate step name uniqueness
    const stepValidation = validateStepNameUniqueness(parsedYaml.data as WorkflowYaml);
    if (!stepValidation.isValid) {
      const errorMessages = stepValidation.errors.map((error) => error.message);
      throw new WorkflowValidationError(
        'Workflow validation failed: Step names must be unique throughout the workflow.',
        errorMessages
      );
    }

    // The type of parsedYaml.data is validated by getWorkflowZodSchemaLoose(), so this assertion is partially safe.
    const workflowToCreate = transformWorkflowYamlJsontoEsWorkflow(parsedYaml.data as WorkflowYaml);
    const authenticatedUser = getAuthenticatedUser(request, this.security);
    const now = new Date();

    const workflowData: WorkflowProperties = {
      name: workflowToCreate.name,
      description: workflowToCreate.description,
      enabled: workflowToCreate.enabled,
      tags: workflowToCreate.tags || [],
      yaml: workflow.yaml,
      definition: workflowToCreate.definition,
      createdBy: authenticatedUser,
      lastUpdatedBy: authenticatedUser,
      spaceId,
      valid: true,
      deleted_at: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    const id = this.generateWorkflowId();

    await this.workflowStorage.getClient().index({
      id,
      document: workflowData,
    });

    // Schedule the workflow if it has triggers
    if (this.taskScheduler && workflowToCreate.definition.triggers) {
      for (const trigger of workflowToCreate.definition.triggers) {
        if (trigger.type === 'scheduled' && trigger.enabled) {
          await this.taskScheduler.scheduleWorkflowTask(id, spaceId, trigger, request);
        }
      }
    }

    return this.transformStorageDocumentToWorkflowDto(id, workflowData);
  }

  public async updateWorkflow(
    id: string,
    workflow: Partial<EsWorkflow>,
    spaceId: string,
    request: KibanaRequest
  ): Promise<UpdatedWorkflowResponseDto> {
    if (!this.workflowStorage) {
      throw new Error('WorkflowsService not initialized');
    }

    try {
      // First check if the workflow exists and belongs to the correct space
      const searchResponse = await this.workflowStorage.getClient().search({
        query: {
          bool: {
            must: [{ ids: { values: [id] } }, { term: { spaceId } }],
          },
        },
        size: 1,
        track_total_hits: false,
      });

      if (searchResponse.hits.hits.length === 0) {
        throw new Error(`Workflow with id ${id} not found in space ${spaceId}`);
      }

      const existingDocument = searchResponse.hits.hits[0];
      if (!existingDocument._source) {
        throw new Error(`Workflow with id ${id} not found`);
      }

      const authenticatedUser = getAuthenticatedUser(request, this.security);
      const now = new Date();
      const validationErrors: string[] = [];

      const updatedData: Partial<WorkflowProperties> = {
        lastUpdatedBy: authenticatedUser,
        updated_at: now.toISOString(),
      };

      // If yaml is being updated, validate and update definition
      let shouldUpdateScheduler = false;

      // Check if enabled state is being changed
      if (workflow.enabled !== undefined && workflow.enabled !== existingDocument._source.enabled) {
        shouldUpdateScheduler = true;
      }

      // Handle yaml updates - this will also update definition and validation
      if (workflow.yaml) {
        // we always update the yaml, even if it's not valid, to allow users to save draft
        updatedData.yaml = workflow.yaml;
        const parsedYaml = parseWorkflowYamlToJSON(workflow.yaml, getWorkflowZodSchema());
        if (!parsedYaml.success) {
          updatedData.definition = undefined;
          updatedData.enabled = false;
          updatedData.valid = false;
          if (
            parsedYaml.error instanceof InvalidYamlSchemaError &&
            parsedYaml.error.formattedZodError
          ) {
            validationErrors.push(
              ...parsedYaml.error.formattedZodError.issues.map((error) => error.message)
            );
          } else {
            validationErrors.push(parsedYaml.error.message);
          }
          shouldUpdateScheduler = true;
        } else {
          // Validate step name uniqueness
          const stepValidation = validateStepNameUniqueness(parsedYaml.data as WorkflowYaml);
          if (!stepValidation.isValid) {
            updatedData.definition = undefined;
            updatedData.enabled = false;
            updatedData.valid = false;
            validationErrors.push(...stepValidation.errors.map((error) => error.message));
            shouldUpdateScheduler = true;
          } else {
            const workflowDef = transformWorkflowYamlJsontoEsWorkflow(
              parsedYaml.data as WorkflowYaml
            );
            // Update all fields from the transformed YAML, not just definition
            updatedData.definition = workflowDef.definition;
            updatedData.name = workflowDef.name;
            updatedData.enabled = workflowDef.enabled;
            updatedData.description = workflowDef.description;
            updatedData.tags = workflowDef.tags;
            updatedData.valid = true;
            updatedData.yaml = workflow.yaml;
            shouldUpdateScheduler = true;
          }
        }
      }

      // Handle individual field updates only when YAML is not being updated
      if (!workflow.yaml) {
        let yamlUpdated = false;

        if (workflow.name !== undefined) {
          updatedData.name = workflow.name;
          yamlUpdated = true;
        }
        if (workflow.enabled !== undefined) {
          // If enabling a workflow, ensure it has a valid definition
          if (workflow.enabled && existingDocument._source?.definition) {
            updatedData.enabled = true;
          } else if (!workflow.enabled) {
            updatedData.enabled = false;
          }
          yamlUpdated = true;
        }
        if (workflow.description !== undefined) {
          updatedData.description = workflow.description;
          yamlUpdated = true;
        }
        if (workflow.tags !== undefined) {
          updatedData.tags = workflow.tags;
          yamlUpdated = true;
        }

        // If any individual fields were updated, regenerate the YAML content
        if (yamlUpdated && existingDocument._source?.definition) {
          const updatedWorkflowDefinition = {
            ...existingDocument._source.definition,
            ...(workflow.name !== undefined && { name: workflow.name }),
            ...(workflow.enabled !== undefined && { enabled: updatedData.enabled }),
            ...(workflow.description !== undefined && { description: workflow.description }),
            ...(workflow.tags !== undefined && { tags: workflow.tags }),
          };
          updatedData.yaml = stringifyWorkflowDefinition(updatedWorkflowDefinition);
        }
      }

      const finalData = { ...existingDocument._source, ...updatedData };

      await this.workflowStorage.getClient().index({
        id,
        document: finalData,
      });

      // Update task scheduler if needed
      if (shouldUpdateScheduler && this.taskScheduler) {
        try {
          if (finalData.definition && finalData.valid && finalData.enabled) {
            // Check if workflow has scheduled triggers before updating scheduler
            const workflowHasScheduledTriggers = hasScheduledTriggers(
              finalData.definition.triggers || []
            );

            if (workflowHasScheduledTriggers) {
              // Get the updated workflow from storage
              const updatedWorkflow = await this.getWorkflow(id, spaceId);
              if (updatedWorkflow && updatedWorkflow.definition) {
                // Convert WorkflowDetailDto to EsWorkflow for scheduler
                const workflowForScheduler: EsWorkflow = {
                  ...updatedWorkflow,
                  definition: updatedWorkflow.definition, // We already checked it's not null
                  tags: [], // TODO: Add tags support to WorkflowDetailDto
                  deleted_at: null,
                };

                await this.taskScheduler.updateWorkflowTasks(
                  workflowForScheduler,
                  spaceId,
                  request
                );
                this.logger.info(`Updated scheduled tasks for workflow ${id}`);
              }
            } else {
              // No scheduled triggers, remove any existing scheduled tasks
              await this.taskScheduler.unscheduleWorkflowTasks(id);
              this.logger.info(
                `Removed scheduled tasks for workflow ${id} (no scheduled triggers)`
              );
            }
          } else {
            // If workflow is invalid or disabled, remove all scheduled tasks
            await this.taskScheduler.unscheduleWorkflowTasks(id);
            this.logger.info(
              `Removed all scheduled tasks for workflow ${id} (workflow disabled or invalid)`
            );
          }
        } catch (error) {
          this.logger.error(`Failed to update scheduled tasks for workflow ${id}: ${error}`);
          // Don't throw the error - the workflow update should succeed even if scheduler update fails
        }
      }

      return {
        id,
        lastUpdatedAt: new Date(finalData.updated_at),
        lastUpdatedBy: finalData.lastUpdatedBy,
        enabled: finalData.enabled,
        validationErrors,
        valid: finalData.valid,
      };
    } catch (error) {
      if (error.statusCode === 404) {
        throw new Error(`Workflow with id ${id} not found`);
      }
      throw error;
    }
  }

  public async deleteWorkflows(ids: string[], spaceId: string): Promise<void> {
    if (!this.workflowStorage) {
      throw new Error('WorkflowsService not initialized');
    }

    const now = new Date();

    // Soft delete by setting deleted_at timestamp
    for (const id of ids) {
      try {
        // Check if workflow exists and belongs to the correct space
        const searchResponse = await this.workflowStorage.getClient().search({
          query: {
            bool: {
              must: [{ ids: { values: [id] } }, { term: { spaceId } }],
            },
          },
          size: 1,
          track_total_hits: false,
        });

        if (searchResponse.hits.hits.length > 0) {
          const existingDocument = searchResponse.hits.hits[0];
          const updatedData = {
            ...existingDocument._source,
            deleted_at: now,
            enabled: false,
          };

          await this.workflowStorage.getClient().index({
            id,
            document: updatedData,
          });
        }
      } catch (error) {
        if (error.statusCode !== 404) {
          throw error;
        }
        // Ignore not found errors for soft delete
      }
    }
  }

  public async getWorkflows(params: GetWorkflowsParams, spaceId: string): Promise<WorkflowListDto> {
    if (!this.workflowStorage) {
      throw new Error('WorkflowsService not initialized');
    }

    const { limit = 20, page = 1, enabled, createdBy, query } = params;
    const from = (page - 1) * limit;

    const must: any[] = [];

    // Filter by spaceId
    must.push({ term: { spaceId } });

    // Exclude soft-deleted workflows
    must.push({
      bool: {
        must_not: {
          exists: { field: 'deleted_at' },
        },
      },
    });

    if (enabled !== undefined && enabled.length > 0) {
      must.push({ terms: { enabled } });
    }

    if (createdBy && createdBy.length > 0) {
      must.push({ terms: { createdBy } });
    }

    if (query) {
      must.push({
        bool: {
          should: [
            // Exact phrase matching with boost (text fields only)
            {
              multi_match: {
                query,
                fields: ['name^3', 'description^2'],
                type: 'phrase',
                boost: 3,
              },
            },
            // Word-level matching (all fields)
            {
              multi_match: {
                query,
                fields: ['name^2', 'description', 'tags'],
                type: 'best_fields',
                boost: 2,
              },
            },
            // Prefix matching for partial word matches (text fields only)
            {
              multi_match: {
                query,
                fields: ['name^2', 'description'],
                type: 'phrase_prefix',
                boost: 1.5,
              },
            },
            // Wildcard matching for more flexible partial matches
            {
              bool: {
                should: [
                  {
                    wildcard: {
                      'name.keyword': {
                        value: `*${query}*`,
                        case_insensitive: true,
                        boost: 1,
                      },
                    },
                  },
                  {
                    wildcard: {
                      'description.keyword': {
                        value: `*${query}*`,
                        case_insensitive: true,
                        boost: 0.5,
                      },
                    },
                  },
                  {
                    wildcard: {
                      tags: {
                        value: `*${query}*`,
                        case_insensitive: true,
                        boost: 0.5,
                      },
                    },
                  },
                ],
              },
            },
          ],
          minimum_should_match: 1,
        },
      });
    }

    const searchResponse = await this.workflowStorage.getClient().search({
      size: limit,
      from,
      track_total_hits: true,
      query: {
        bool: { must },
      },
      sort: [{ updated_at: { order: 'desc' } }],
    });

    const workflows = searchResponse.hits.hits
      .map((hit) => {
        if (!hit._source) {
          throw new Error('Missing _source in search result');
        }
        const workflow = this.transformStorageDocumentToWorkflowDto(hit._id!, hit._source);
        return {
          ...workflow,
          description: workflow.description || '',
          definition: workflow.definition,
          history: [] as WorkflowExecutionHistoryModel[], // Will be populated below
        };
      })
      .filter((workflow): workflow is NonNullable<typeof workflow> => workflow !== null);

    // Fetch recent execution history for all workflows
    if (workflows.length > 0) {
      const workflowIds = workflows.map((w) => w.id);
      const executionHistory = await this.getRecentExecutionsForWorkflows(workflowIds, spaceId);

      // Populate history for each workflow
      workflows.forEach((workflow) => {
        workflow.history = executionHistory[workflow.id] || [];
      });
    }

    return {
      _pagination: {
        page,
        limit,
        total:
          typeof searchResponse.hits.total === 'number'
            ? searchResponse.hits.total
            : searchResponse.hits.total?.value || 0,
      },
      results: workflows,
    };
  }

  public async getWorkflowStats(spaceId: string): Promise<WorkflowStatsDto> {
    if (!this.workflowStorage) {
      throw new Error('WorkflowsService not initialized');
    }

    const statsResponse = await this.workflowStorage.getClient().search({
      size: 0,
      track_total_hits: true,
      query: {
        bool: {
          must: [{ term: { spaceId } }],
          must_not: {
            exists: { field: 'deleted_at' },
          },
        },
      },
      aggs: {
        enabled_count: {
          filter: { term: { enabled: true } },
        },
        disabled_count: {
          filter: { term: { enabled: false } },
        },
      },
    });

    const aggs = statsResponse.aggregations as any;

    // Get execution history stats for the last 30 days
    const executionStats = await this.getExecutionHistoryStats(spaceId);

    return {
      workflows: {
        enabled: aggs.enabled_count.doc_count,
        disabled: aggs.disabled_count.doc_count,
      },
      executions: executionStats,
    };
  }

  private async getExecutionHistoryStats(spaceId: string) {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const response = await this.esClient!.search({
        index: this.workflowsExecutionIndex,
        size: 0,
        query: {
          bool: {
            must: [
              {
                range: {
                  createdAt: {
                    gte: thirtyDaysAgo.toISOString(),
                  },
                },
              },
              { term: { spaceId } },
            ],
          },
        },
        aggs: {
          daily_stats: {
            date_histogram: {
              field: 'createdAt',
              calendar_interval: 'day',
              format: 'yyyy-MM-dd',
            },
            aggs: {
              completed: {
                filter: { term: { status: 'completed' } },
              },
              failed: {
                filter: { term: { status: 'failed' } },
              },
              cancelled: {
                filter: { term: { status: 'cancelled' } },
              },
            },
          },
        },
      });

      const buckets = (response.aggregations as any)?.daily_stats?.buckets || [];

      return buckets.map((bucket: any) => ({
        date: bucket.key_as_string,
        timestamp: bucket.key,
        completed: bucket.completed.doc_count,
        failed: bucket.failed.doc_count,
        cancelled: bucket.cancelled.doc_count,
      }));
    } catch (error) {
      this.logger.error('Failed to get execution history stats', error);
      return [];
    }
  }

  public async getWorkflowAggs(fields: string[], spaceId: string): Promise<WorkflowAggsDto> {
    if (!this.workflowStorage) {
      throw new Error('WorkflowsService not initialized');
    }

    const aggs: Record<string, any> = {};

    fields.forEach((field) => {
      aggs[field] = {
        terms: {
          field: field === 'name' ? 'name.keyword' : field,
          size: 100,
        },
      };
    });

    const aggsResponse = await this.workflowStorage.getClient().search({
      size: 0,
      track_total_hits: true,
      query: {
        bool: {
          must: [{ term: { spaceId } }],
          must_not: {
            exists: { field: 'deleted_at' },
          },
        },
      },
      aggs,
    });

    const result: WorkflowAggsDto = {};
    const responseAggs = aggsResponse.aggregations as any;

    fields.forEach((field) => {
      if (responseAggs[field]) {
        result[field] = responseAggs[field].buckets.map((bucket: any) => ({
          label: bucket.key_as_string,
          key: bucket.key,
          doc_count: bucket.doc_count,
        }));
      }
    });

    return result;
  }

  // Helper methods remain the same as they don't interact with SavedObjects
  public async getWorkflowExecution(
    executionId: string,
    spaceId: string
  ): Promise<WorkflowExecutionDto | null> {
    return getWorkflowExecution({
      esClient: this.esClient!,
      logger: this.logger,
      workflowExecutionIndex: this.workflowsExecutionIndex,
      stepsExecutionIndex: this.stepsExecutionIndex,
      workflowExecutionId: executionId,
      spaceId,
    });
  }

  public async getWorkflowExecutions(
    params: SearchWorkflowExecutionsParams,
    spaceId: string
  ): Promise<WorkflowExecutionListDto> {
    const must: estypes.QueryDslQueryContainer[] = [
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
    ];

    if (params.statuses) {
      must.push({
        terms: {
          status: params.statuses,
        },
      });
    }
    if (params.executionTypes) {
      must.push({
        terms: {
          executionType: params.executionTypes,
        },
      });
    }

    return searchWorkflowExecutions({
      esClient: this.esClient!,
      logger: this.logger,
      workflowExecutionIndex: this.workflowsExecutionIndex,
      query: {
        bool: {
          must,
        },
      },
    });
  }

  public async getWorkflowExecutionHistory(
    executionId: string,
    spaceId: string
  ): Promise<WorkflowExecutionHistoryModel[]> {
    const response = await this.esClient!.search<EsWorkflowStepExecution>({
      index: this.stepsExecutionIndex,
      query: {
        bool: {
          must: [
            {
              term: {
                executionId,
              },
            },
            { term: { spaceId } },
          ],
        },
      },
      sort: [{ timestamp: { order: 'asc' } }],
    });

    return response.hits.hits.map((hit) => {
      const source = hit._source!;
      const startedAt = source.startedAt;
      const finishedAt = (source as any).endedAt || (source as any).finishedAt;

      // Calculate duration in milliseconds if both timestamps are available
      let duration = 0;
      if (startedAt && finishedAt) {
        duration = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
      }

      return {
        ...source,
        finishedAt: finishedAt || '',
        duration,
      };
    });
  }

  /**
   * Efficiently fetch the most recent execution for multiple workflows
   */
  private async getRecentExecutionsForWorkflows(
    workflowIds: string[],
    spaceId: string
  ): Promise<Record<string, WorkflowExecutionHistoryModel[]>> {
    if (!this.esClient || workflowIds.length === 0) {
      return {};
    }

    try {
      const response = await this.esClient.search<EsWorkflowExecution>({
        index: this.workflowsExecutionIndex,
        size: 0, // We only want aggregations
        query: {
          bool: {
            must: [
              { terms: { workflowId: workflowIds } },
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
        aggs: {
          workflows: {
            terms: {
              field: 'workflowId',
              size: workflowIds.length,
            },
            aggs: {
              recent_executions: {
                top_hits: {
                  size: 1, // Get only the most recent execution per workflow
                  sort: [{ finishedAt: { order: 'desc' } }],
                },
              },
            },
          },
        },
      });

      const result: Record<string, WorkflowExecutionHistoryModel[]> = {};

      if (response.aggregations?.workflows && 'buckets' in response.aggregations.workflows) {
        const buckets = response.aggregations.workflows.buckets as Array<{
          key: string;
          recent_executions: {
            hits: {
              hits: Array<{
                _source: EsWorkflowExecution;
              }>;
            };
          };
        }>;

        buckets.forEach((bucket) => {
          const workflowId = bucket.key;
          const hits = bucket.recent_executions.hits.hits;

          if (hits.length > 0) {
            const execution = hits[0]._source;
            result[workflowId] = [
              {
                id: execution.id,
                workflowId: execution.workflowId,
                workflowName: execution.workflowDefinition?.name || 'Unknown Workflow',
                status: execution.status,
                startedAt: execution.startedAt,
                finishedAt: execution.finishedAt || execution.startedAt,
                duration:
                  execution.finishedAt && execution.startedAt
                    ? new Date(execution.finishedAt).getTime() -
                      new Date(execution.startedAt).getTime()
                    : null,
              },
            ];
          }
        });
      }

      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch recent executions for workflows: ${error}`);
      return {};
    }
  }

  public async getStepExecutions(params: GetStepExecutionParams, spaceId: string) {
    return searchStepExecutions({
      esClient: this.esClient!,
      logger: this.logger,
      stepsExecutionIndex: this.stepsExecutionIndex,
      workflowExecutionId: params.executionId,
      additionalQuery: { term: { id: params.id } },
      spaceId,
    });
  }

  public async getExecutionLogs(
    params: GetExecutionLogsParams,
    spaceId: string
  ): Promise<LogSearchResult> {
    return this.workflowEventLoggerService!.searchLogs(params, spaceId);
  }

  public async getStepLogs(params: GetStepLogsParams, spaceId: string): Promise<LogSearchResult> {
    return this.workflowEventLoggerService!.searchLogs(params, spaceId);
  }

  public getLogger(): IWorkflowEventLogger {
    return this.workflowEventLoggerService!;
  }

  public async getStepExecution(
    params: GetStepExecutionParams,
    spaceId: string
  ): Promise<EsWorkflowStepExecution | null> {
    const { executionId, id } = params;
    const response = await this.esClient!.search<EsWorkflowStepExecution>({
      index: this.stepsExecutionIndex,
      query: {
        bool: {
          must: [{ term: { workflowRunId: executionId } }, { term: { id } }, { term: { spaceId } }],
        },
      },
      size: 1,
      track_total_hits: false,
    });

    if (response.hits.hits.length === 0) {
      return null;
    }

    return response.hits.hits[0]._source as EsWorkflowStepExecution;
  }

  private transformStorageDocumentToWorkflowDto(
    id: string,
    source: WorkflowProperties
  ): WorkflowDetailDto {
    return {
      id,
      name: source.name,
      description: source.description,
      enabled: source.enabled,
      yaml: source.yaml,
      definition: source.definition,
      createdBy: source.createdBy,
      lastUpdatedBy: source.lastUpdatedBy,
      valid: source.valid,
      createdAt: new Date(source.created_at),
      lastUpdatedAt: new Date(source.updated_at),
    };
  }

  private generateWorkflowId(): string {
    return `workflow-${generateUuid()}`;
  }
}
