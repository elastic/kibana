/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import { v4 as generateUuid } from 'uuid';
import { WorkflowsConnectorFeatureId } from '@kbn/actions-plugin/common/connector_feature_config';
import type { ActionsClient, IUnsecuredActionsClient } from '@kbn/actions-plugin/server';
import type { FindActionResult } from '@kbn/actions-plugin/server/types';
import type {
  CoreStart,
  ElasticsearchClient,
  KibanaRequest,
  Logger,
  SecurityServiceStart,
} from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type {
  ConnectorTypeInfo,
  CreateWorkflowCommand,
  EsWorkflow,
  EsWorkflowCreate,
  EsWorkflowExecution,
  EsWorkflowStepExecution,
  ExecutionStatus,
  UpdatedWorkflowResponseDto,
  WorkflowAggsDto,
  WorkflowDetailDto,
  WorkflowExecutionDto,
  WorkflowExecutionHistoryModel,
  WorkflowExecutionListDto,
  WorkflowListDto,
  WorkflowStatsDto,
  WorkflowYaml,
} from '@kbn/workflows';
import { ExecutionType, transformWorkflowYamlJsontoEsWorkflow } from '@kbn/workflows';
import type { ConnectorInstanceConfig } from '@kbn/workflows/types/v1';
import type {
  IWorkflowEventLoggerService,
  LogSearchResult,
} from '@kbn/workflows-execution-engine/server';
import type {
  ExecutionLogsParams,
  StepLogsParams,
} from '@kbn/workflows-execution-engine/server/workflow_event_logger/types';
import type { z } from '@kbn/zod/v4';

import { getWorkflowExecution } from './lib/get_workflow_execution';
import { searchStepExecutions } from './lib/search_step_executions';
import { searchWorkflowExecutions } from './lib/search_workflow_executions';

import type {
  DeleteWorkflowsResponse,
  GetAvailableConnectorsResponse,
  GetStepExecutionParams,
  GetWorkflowsParams,
} from './workflows_management_api';
import { WORKFLOWS_EXECUTIONS_INDEX, WORKFLOWS_STEP_EXECUTIONS_INDEX } from '../../common';
import { CONNECTOR_SUB_ACTIONS_MAP } from '../../common/connector_sub_actions_map';
import {
  InvalidYamlSchemaError,
  WorkflowConflictError,
  WorkflowValidationError,
} from '../../common/lib/errors';

import { validateStepNameUniqueness } from '../../common/lib/validate_step_names';
import { parseWorkflowYamlToJSON, updateWorkflowYamlFields } from '../../common/lib/yaml';
import { getWorkflowZodSchema } from '../../common/schema';
import { getAuthenticatedUser } from '../lib/get_user';
import { hasScheduledTriggers } from '../lib/schedule_utils';
import type { WorkflowProperties, WorkflowStorage } from '../storage/workflow_storage';
import { createStorage } from '../storage/workflow_storage';
import type { WorkflowTaskScheduler } from '../tasks/workflow_task_scheduler';
import type { WorkflowsServerPluginStartDeps } from '../types';

const DEFAULT_PAGE_SIZE = 100;
export interface SearchWorkflowExecutionsParams {
  workflowId: string;
  statuses?: ExecutionStatus[];
  executionTypes?: ExecutionType[];
  executedBy?: string[];
  page?: number;
  size?: number;
}

export class WorkflowsService {
  private esClient!: ElasticsearchClient;
  private workflowStorage!: WorkflowStorage;
  private workflowEventLoggerService!: IWorkflowEventLoggerService;
  private taskScheduler: WorkflowTaskScheduler | null = null;
  private readonly logger: Logger;
  private security?: SecurityServiceStart;
  private readonly getPluginsStart: () => Promise<WorkflowsServerPluginStartDeps>;
  private getActionsClient: () => Promise<IUnsecuredActionsClient>;
  private getActionsClientWithRequest: (
    request: KibanaRequest
  ) => Promise<PublicMethodsOf<ActionsClient>>;

  constructor(
    logger: Logger,
    getCoreStart: () => Promise<CoreStart>,
    getPluginsStart: () => Promise<WorkflowsServerPluginStartDeps>
  ) {
    this.logger = logger;
    this.getPluginsStart = getPluginsStart;
    this.getActionsClient = () =>
      getPluginsStart().then((plugins) => plugins.actions.getUnsecuredActionsClient());
    this.getActionsClientWithRequest = (request: KibanaRequest) =>
      getPluginsStart().then((plugins) => plugins.actions.getActionsClientWithRequest(request));

    void this.initialize(getCoreStart, getPluginsStart);
  }

  public setTaskScheduler(taskScheduler: WorkflowTaskScheduler) {
    this.taskScheduler = taskScheduler;
  }

  public setSecurityService(security: SecurityServiceStart) {
    this.security = security;
  }

  private async initialize(
    getCoreStart: () => Promise<CoreStart>,
    getPluginsStart: () => Promise<WorkflowsServerPluginStartDeps>
  ) {
    const coreStart = await getCoreStart();
    const pluginsStart = await getPluginsStart();

    this.esClient = coreStart.elasticsearch.client.asInternalUser;

    // Initialize workflow storage
    this.workflowStorage = createStorage({
      logger: this.logger,
      esClient: this.esClient,
    });

    this.workflowEventLoggerService =
      pluginsStart.workflowsExecutionEngine.workflowEventLoggerService;
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
      return this.transformStorageDocumentToWorkflowDto(document._id, document._source);
    } catch (error) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Parses and validates a workflow YAML, returning the prepared document and metadata.
   * Shared by createWorkflow and bulkCreateWorkflows.
   */
  private prepareWorkflowDocument(
    workflow: CreateWorkflowCommand,
    zodSchema: z.ZodType,
    authenticatedUser: string,
    now: Date,
    spaceId: string
  ): { id: string; workflowData: WorkflowProperties; definition?: WorkflowYaml } {
    let workflowToCreate: EsWorkflowCreate = {
      name: 'Untitled workflow',
      description: undefined,
      enabled: false,
      tags: [],
      definition: undefined,
      valid: false,
    };

    const parsedYaml = parseWorkflowYamlToJSON(workflow.yaml, zodSchema);
    if (parsedYaml.success) {
      workflowToCreate = transformWorkflowYamlJsontoEsWorkflow(
        parsedYaml.data as unknown as WorkflowYaml
      );

      const stepValidation = validateStepNameUniqueness(parsedYaml.data as unknown as WorkflowYaml);
      if (!stepValidation.isValid) {
        workflowToCreate.valid = false;
        workflowToCreate.definition = undefined;
      }
    }

    const id = workflow.id || this.generateWorkflowId();

    if (workflow.id) {
      this.validateWorkflowId(workflow.id);
    }

    const workflowData: WorkflowProperties = {
      name: workflowToCreate.name,
      description: workflowToCreate.description,
      enabled: workflowToCreate.enabled,
      tags: workflowToCreate.tags || [],
      yaml: workflow.yaml,
      definition: workflowToCreate.definition ?? null,
      createdBy: authenticatedUser,
      lastUpdatedBy: authenticatedUser,
      spaceId,
      valid: workflowToCreate.valid,
      deleted_at: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    return { id, workflowData, definition: workflowToCreate.definition };
  }

  /**
   * Schedules triggers for a workflow. Used by both createWorkflow and bulkCreateWorkflows.
   */
  private async scheduleWorkflowTriggers(
    workflowId: string,
    definition: WorkflowYaml | undefined,
    spaceId: string,
    request: KibanaRequest
  ): Promise<void> {
    const { taskScheduler } = this;
    if (!taskScheduler || !definition?.triggers) {
      return;
    }

    const scheduledTriggers = definition.triggers.filter((t) => t.type === 'scheduled');
    await Promise.allSettled(
      scheduledTriggers.map((trigger) =>
        taskScheduler.scheduleWorkflowTask(workflowId, spaceId, trigger, request)
      )
    ).then((results) => {
      results.forEach((result, i) => {
        if (result.status === 'rejected') {
          this.logger.warn(
            `Failed to schedule trigger for workflow ${workflowId}: ${result.reason}`
          );
        }
      });
    });
  }

  public async createWorkflow(
    workflow: CreateWorkflowCommand,
    spaceId: string,
    request: KibanaRequest
  ): Promise<WorkflowDetailDto> {
    if (!this.workflowStorage) {
      throw new Error('WorkflowsService not initialized');
    }

    const zodSchema = await this.getWorkflowZodSchema({ loose: false }, spaceId, request);
    const authenticatedUser = getAuthenticatedUser(request, this.security);
    const now = new Date();

    const { id, workflowData, definition } = this.prepareWorkflowDocument(
      workflow,
      zodSchema,
      authenticatedUser,
      now,
      spaceId
    );

    if (workflow.id) {
      const existingWorkflow = await this.getWorkflow(workflow.id, spaceId);
      if (existingWorkflow) {
        throw new WorkflowConflictError(
          `Workflow with id '${workflow.id}' already exists`,
          workflow.id
        );
      }
    }

    await this.workflowStorage.getClient().index({
      id,
      document: workflowData,
      refresh: true,
    });

    await this.scheduleWorkflowTriggers(id, definition, spaceId, request);

    return this.transformStorageDocumentToWorkflowDto(id, workflowData);
  }

  public async bulkCreateWorkflows(
    workflows: CreateWorkflowCommand[],
    spaceId: string,
    request: KibanaRequest
  ): Promise<{
    created: WorkflowDetailDto[];
    failed: Array<{ index: number; error: string }>;
  }> {
    if (!this.workflowStorage) {
      throw new Error('WorkflowsService not initialized');
    }

    const zodSchema = await this.getWorkflowZodSchema({ loose: false }, spaceId, request);
    const authenticatedUser = getAuthenticatedUser(request, this.security);
    const now = new Date();

    const created: WorkflowDetailDto[] = [];
    const failed: Array<{ index: number; error: string }> = [];
    const bulkOperations: Array<{
      index: { _id: string; document: WorkflowProperties };
    }> = [];
    const validWorkflows: Array<{
      idx: number;
      id: string;
      workflowData: WorkflowProperties;
      definition?: WorkflowYaml;
    }> = [];

    // Phase 1: Validate all workflows and prepare bulk operations
    for (let i = 0; i < workflows.length; i++) {
      try {
        const prepared = this.prepareWorkflowDocument(
          workflows[i],
          zodSchema,
          authenticatedUser,
          now,
          spaceId
        );

        bulkOperations.push({
          index: { _id: prepared.id, document: prepared.workflowData },
        });
        validWorkflows.push({
          idx: i,
          id: prepared.id,
          workflowData: prepared.workflowData,
          definition: prepared.definition,
        });
      } catch (error) {
        failed.push({
          index: i,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Phase 2: Bulk index all valid workflows using op_type: create to reject duplicates
    if (bulkOperations.length > 0) {
      const bulkResponse = await this.workflowStorage.getClient().bulk({
        operations: bulkOperations,
        refresh: true,
      });

      // Process bulk response
      bulkResponse.items.forEach((item, itemIndex) => {
        const operation = item.index;
        const validWorkflow = validWorkflows[itemIndex];

        if (operation?.error) {
          failed.push({
            index: validWorkflow.idx,
            error:
              typeof operation.error === 'object' && 'reason' in operation.error
                ? operation.error.reason ?? JSON.stringify(operation.error)
                : JSON.stringify(operation.error),
          });
        } else {
          created.push(
            this.transformStorageDocumentToWorkflowDto(validWorkflow.id, validWorkflow.workflowData)
          );
        }
      });
    }

    // Phase 3: Schedule triggers for successfully created workflows (in parallel)
    const workflowsToSchedule = validWorkflows.filter(
      (vw) =>
        created.some((w) => w.id === vw.id) &&
        vw.definition?.triggers?.some((t) => t.type === 'scheduled')
    );

    await Promise.allSettled(
      workflowsToSchedule.map((vw) =>
        this.scheduleWorkflowTriggers(vw.id, vw.definition, spaceId, request)
      )
    );

    return { created, failed };
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
        const parsedYaml = parseWorkflowYamlToJSON(
          workflow.yaml,
          await this.getWorkflowZodSchema({ loose: false }, spaceId, request)
        );
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
          const stepValidation = validateStepNameUniqueness(
            parsedYaml.data as unknown as WorkflowYaml
          );
          if (!stepValidation.isValid) {
            updatedData.definition = undefined;
            updatedData.enabled = false;
            updatedData.valid = false;
            validationErrors.push(...stepValidation.errors.map((error) => error.message));
            shouldUpdateScheduler = true;
          } else {
            const workflowDef = transformWorkflowYamlJsontoEsWorkflow(
              parsedYaml.data as unknown as WorkflowYaml
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

        if (yamlUpdated && existingDocument._source?.yaml) {
          // Use in-place YAML field updates to preserve formatting, comments,
          // and template expressions that would be corrupted by a parse-to-JSON then re-stringify cycle.
          // `enabledValue` is passed separately because the server may override
          // the requested value (e.g. force `false` when the workflow has no valid
          // definition). Other fields (name, description, tags) are read directly
          // from the `workflow` object inside `updateWorkflowYamlFields`.
          updatedData.yaml = updateWorkflowYamlFields(
            existingDocument._source.yaml,
            workflow,
            updatedData.enabled
          );
        }
      }

      const finalData = { ...existingDocument._source, ...updatedData };

      await this.workflowStorage.getClient().index({
        id,
        document: finalData,
        refresh: true,
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
                  createdAt: new Date(updatedWorkflow.createdAt),
                  lastUpdatedAt: new Date(updatedWorkflow.lastUpdatedAt),
                };

                await this.taskScheduler.updateWorkflowTasks(
                  workflowForScheduler,
                  spaceId,
                  request
                );
                this.logger.debug(`Updated scheduled tasks for workflow ${id}`);
              }
            } else {
              // No scheduled triggers, remove any existing scheduled tasks
              await this.taskScheduler.unscheduleWorkflowTasks(id);
              this.logger.debug(
                `Removed scheduled tasks for workflow ${id} (no scheduled triggers)`
              );
            }
          } else {
            // If workflow is invalid or disabled, remove all scheduled tasks
            await this.taskScheduler.unscheduleWorkflowTasks(id);
            this.logger.debug(
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
        lastUpdatedAt: finalData.updated_at,
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

  public async deleteWorkflows(ids: string[], spaceId: string): Promise<DeleteWorkflowsResponse> {
    if (!this.workflowStorage) {
      throw new Error('WorkflowsService not initialized');
    }

    const now = new Date();
    const failures: Array<{ id: string; error: string }> = [];
    const client = this.workflowStorage.getClient();

    // Bulk fetch all workflows in a single search call
    const searchResponse = await client.search({
      query: {
        bool: {
          must: [{ ids: { values: ids } }, { term: { spaceId } }],
        },
      },
      size: ids.length,
      track_total_hits: false,
    });

    // Build bulk operations for all found workflows
    const bulkOperations = searchResponse.hits.hits.map((hit) => ({
      index: {
        _id: hit._id,
        document: {
          ...hit._source,
          deleted_at: now,
          enabled: false,
        },
      },
    }));

    // Bulk update all found workflows in a single call
    if (bulkOperations.length > 0) {
      try {
        const bulkResponse = await client.bulk({
          operations: bulkOperations,
          refresh: true,
        });

        // Process bulk response to track successes and failures
        bulkResponse.items.forEach((item) => {
          const operation = item.index;
          if (operation?.error) {
            failures.push({
              id: operation._id ?? 'unknown',
              error:
                typeof operation.error === 'object' && 'reason' in operation.error
                  ? operation.error.reason ?? JSON.stringify(operation.error)
                  : JSON.stringify(operation.error),
            });
          }
        });
      } catch (error) {
        // If the entire bulk operation fails, mark all as failed
        bulkOperations.forEach((op) => {
          failures.push({
            id: op.index._id ?? 'unknown',
            error: error instanceof Error ? error.message : String(error),
          });
        });
      }
    }

    return {
      total: ids.length,
      deleted: ids.length - failures.length,
      failures,
    };
  }

  public async getWorkflows(params: GetWorkflowsParams, spaceId: string): Promise<WorkflowListDto> {
    if (!this.workflowStorage) {
      throw new Error('WorkflowsService not initialized');
    }

    const { size = 100, page = 1, enabled, createdBy, tags, query } = params;
    const from = (page - 1) * size;

    const must: estypes.QueryDslQueryContainer[] = [];

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

    if (tags && tags.length > 0) {
      must.push({ terms: { tags } });
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
      size,
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
        const workflow = this.transformStorageDocumentToWorkflowDto(hit._id, hit._source);
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
      page,
      size,
      total:
        typeof searchResponse.hits.total === 'number'
          ? searchResponse.hits.total
          : searchResponse.hits.total?.value || 0,
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

    const aggs = statsResponse.aggregations;

    // Get execution history stats for the last 30 days
    const executionStats = await this.getExecutionHistoryStats(spaceId);

    return {
      workflows: {
        enabled: aggs?.enabled_count.doc_count ?? 0,
        disabled: aggs?.disabled_count.doc_count ?? 0,
      },
      executions: executionStats,
    };
  }

  private async getExecutionHistoryStats(spaceId: string) {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const response = await this.esClient.search({
        index: WORKFLOWS_EXECUTIONS_INDEX,
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const buckets = (response.aggregations as any)?.daily_stats?.buckets || [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const responseAggs = aggsResponse.aggregations as any;

    fields.forEach((field) => {
      if (responseAggs[field]) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      esClient: this.esClient,
      logger: this.logger,
      workflowExecutionIndex: WORKFLOWS_EXECUTIONS_INDEX,
      stepsExecutionIndex: WORKFLOWS_STEP_EXECUTIONS_INDEX,
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
    if (params.executionTypes && params.executionTypes?.length === 1) {
      const isTestRun = params.executionTypes[0] === ExecutionType.TEST;

      if (isTestRun) {
        must.push({
          term: {
            isTestRun,
          },
        });
      } else {
        // the field isTestRun do not exist for regular runs
        // so we need to check for both cases: field not existing or field being false
        must.push({
          bool: {
            should: [
              { term: { isTestRun: false } },
              { bool: { must_not: { exists: { field: 'isTestRun' } } } },
            ],
            minimum_should_match: 1,
          },
        });
      }
    }
    if (params.executedBy && params.executedBy.length > 0) {
      must.push({
        terms: {
          executedBy: params.executedBy,
        },
      });
    }

    const page = params.page ?? 1;
    const size = params.size ?? DEFAULT_PAGE_SIZE;
    const from = (page - 1) * size;

    return searchWorkflowExecutions({
      esClient: this.esClient,
      logger: this.logger,
      workflowExecutionIndex: WORKFLOWS_EXECUTIONS_INDEX,
      query: {
        bool: {
          must,
        },
      },
      size,
      from,
      page,
    });
  }

  public async getWorkflowExecutionHistory(
    executionId: string,
    spaceId: string
  ): Promise<WorkflowExecutionHistoryModel[]> {
    const response = await this.esClient.search<EsWorkflowStepExecution>({
      index: WORKFLOWS_STEP_EXECUTIONS_INDEX,
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
      if (!hit._source) {
        throw new Error('Missing _source in search result');
      }
      const source = hit._source;
      const startedAt = source.startedAt;
      // TODO: add these types
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        index: WORKFLOWS_EXECUTIONS_INDEX,
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
      // Index not found is expected when no workflows have been executed yet
      if (!isResponseError(error) || error.body?.error?.type !== 'index_not_found_exception') {
        this.logger.error(`Failed to fetch recent executions for workflows: ${error}`);
      }
      return {};
    }
  }

  public async getStepExecutions(params: GetStepExecutionParams, spaceId: string) {
    return searchStepExecutions({
      esClient: this.esClient,
      logger: this.logger,
      stepsExecutionIndex: WORKFLOWS_STEP_EXECUTIONS_INDEX,
      workflowExecutionId: params.executionId,
      additionalQuery: { term: { id: params.id } },
      spaceId,
    });
  }

  public async getExecutionLogs(params: ExecutionLogsParams): Promise<LogSearchResult> {
    if (!this.workflowEventLoggerService) {
      throw new Error('WorkflowEventLoggerService not initialized');
    }

    return this.workflowEventLoggerService.getExecutionLogs(params);
  }

  public async getStepLogs(params: StepLogsParams): Promise<LogSearchResult> {
    if (!this.workflowEventLoggerService) {
      throw new Error('WorkflowEventLoggerService not initialized');
    }

    return this.workflowEventLoggerService.getStepLogs(params);
  }

  public async getStepExecution(
    params: GetStepExecutionParams,
    spaceId: string
  ): Promise<EsWorkflowStepExecution | null> {
    const { executionId, id } = params;
    const response = await this.esClient.search<EsWorkflowStepExecution>({
      index: WORKFLOWS_STEP_EXECUTIONS_INDEX,
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
    id: string | undefined,
    source: WorkflowProperties | undefined
  ): WorkflowDetailDto {
    if (!id || !source) {
      throw new Error('Invalid document, id or source is undefined');
    }
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
      createdAt: source.created_at,
      lastUpdatedAt: source.updated_at,
    };
  }

  private validateWorkflowId(id: string): void {
    const uuidRegex = /^workflow-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new WorkflowValidationError(
        `Invalid workflow ID format. Expected format: workflow-{uuid}, received: ${id}`
      );
    }
  }

  private generateWorkflowId(): string {
    return `workflow-${generateUuid()}`;
  }

  public async getAvailableConnectors(
    spaceId: string,
    request: KibanaRequest
  ): Promise<GetAvailableConnectorsResponse> {
    const actionsClient = await this.getActionsClient();
    const actionsClientWithRequest = await this.getActionsClientWithRequest(request);

    // Get both connectors and action types
    const [connectors, actionTypes] = await Promise.all([
      actionsClient.getAll(spaceId),
      actionsClientWithRequest.listTypes({
        featureId: WorkflowsConnectorFeatureId,
        includeSystemActionTypes: false,
      }),
    ]);

    // Initialize connectorsByType with ALL available action types
    const connectorsByType: Record<string, ConnectorTypeInfo> = {};

    // First, add all action types (even those without instances), excluding filtered types
    actionTypes.forEach((actionType) => {
      // Get sub-actions from our static mapping
      const subActions = CONNECTOR_SUB_ACTIONS_MAP[actionType.id];

      connectorsByType[actionType.id] = {
        actionTypeId: actionType.id,
        displayName: actionType.name,
        instances: [],
        enabled: actionType.enabled,
        enabledInConfig: actionType.enabledInConfig,
        enabledInLicense: actionType.enabledInLicense,
        minimumLicenseRequired: actionType.minimumLicenseRequired,
        ...(subActions && { subActions }),
      };
    });

    // Then, populate instances for action types that have connectors
    connectors.forEach((connector: FindActionResult) => {
      if (connectorsByType[connector.actionTypeId]) {
        connectorsByType[connector.actionTypeId].instances.push({
          id: connector.id,
          name: connector.name,
          isPreconfigured: connector.isPreconfigured,
          isDeprecated: connector.isDeprecated,
          ...this.getConnectorInstanceConfig(connector),
        });
      }
    });

    return { connectorsByType, totalConnectors: connectors.length };
  }

  private getConnectorInstanceConfig(
    connector: FindActionResult
  ): { config: ConnectorInstanceConfig } | undefined {
    if (connector.actionTypeId === '.inference') {
      return { config: { taskType: connector.config?.taskType } };
    }
    return undefined;
  }

  public async getWorkflowZodSchema(
    options: {
      loose?: false;
    },
    spaceId: string,
    request: KibanaRequest
  ): Promise<z.ZodType> {
    const [plugins, { connectorsByType }] = await Promise.all([
      this.getPluginsStart(),
      this.getAvailableConnectors(spaceId, request),
    ]);
    const registeredTriggerIds = plugins.workflowsExtensions
      .getAllTriggerDefinitions()
      .map((trigger: { id: string }) => trigger.id);
    return getWorkflowZodSchema(connectorsByType, registeredTriggerIds);
  }
}
