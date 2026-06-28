/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
<<<<<<< HEAD
=======
import { WorkflowsConnectorFeatureId } from '@kbn/actions-plugin/common/connector_feature_config';
>>>>>>> 9.4
import type { ActionsClient, IUnsecuredActionsClient } from '@kbn/actions-plugin/server';
import type {
  CoreStart,
  ElasticsearchClient,
  KibanaRequest,
  Logger,
  StartServicesAccessor,
} from '@kbn/core/server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type {
  CreateWorkflowCommand,
  EsWorkflow,
  EsWorkflowStepExecution,
  ExecutionStatus,
  ExecutionType,
  UpdatedWorkflowResponseDto,
  ValidateWorkflowResponseDto,
  WorkflowAggsDto,
  WorkflowDetailDto,
  WorkflowExecutionCollapseField,
  WorkflowExecutionDto,
  WorkflowExecutionHistoryModel,
  WorkflowExecutionListDto,
  WorkflowExecutionSortField,
  WorkflowExecutionSortOrder,
  WorkflowListDto,
  WorkflowStatsDto,
} from '@kbn/workflows';
import type { ManagedWorkflowId } from '@kbn/workflows/managed';
import type {
  ExecuteManagedWorkflowOptions,
  GetManagedWorkflowStatusOptions,
  ManagedWorkflowOperationOptions,
  ManagedWorkflowServiceInstallOptions,
  ManagedWorkflowStatusReport,
} from '@kbn/workflows/server/types';
import type {
  ChildWorkflowExecutionItem,
  GetAvailableConnectorsResponse,
  WorkflowPartialDetailDto,
} from '@kbn/workflows/types/v1';
import type {
  LogSearchResult,
  WorkflowsExecutionEnginePluginStart,
} from '@kbn/workflows-execution-engine/server';
import type {
  ExecutionLogsParams,
  StepLogsParams,
} from '@kbn/workflows-execution-engine/server/workflow_event_logger/types';
import type {
  ServerTriggerDefinition,
  WorkflowsExtensionsServerPluginStart,
} from '@kbn/workflows-extensions/server';
import type { z } from '@kbn/zod/v4';

import type { StepExecutionListResult } from './lib/search_step_executions';

import type {
  DeleteWorkflowsResponse,
  GetStepExecutionParams,
  GetWorkflowAggsOptions,
  GetWorkflowsParams,
  SearchStepExecutionsParams,
} from './workflows_management_api';
<<<<<<< HEAD

import type { BulkFailureEntry } from '../lib/bulk_id_helpers';
import { getHistoryForWorkflow } from '../lib/get_workflow_change_history';
import { readWorkflowVersioningEnabled } from '../lib/is_workflow_versioning_enabled';
import { ManagedWorkflowsService } from '../services/managed_workflows_service';
import { WorkflowChangeHistoryService } from '../services/workflow_change_history_service';
import { WorkflowCrudService } from '../services/workflow_crud_service';
import { WorkflowExecutionQueryService } from '../services/workflow_execution_query_service';
import { WorkflowSearchService } from '../services/workflow_search_service';
import { WorkflowValidationService } from '../services/workflow_validation_service';
import { createStorage, type WorkflowStorage } from '../storage/workflow_storage';
import { WorkflowTaskScheduler } from '../tasks/workflow_task_scheduler';
=======
import { WORKFLOWS_EXECUTIONS_INDEX, WORKFLOWS_STEP_EXECUTIONS_INDEX } from '../../common';
import { CONNECTOR_SUB_ACTIONS_MAP } from '../../common/connector_sub_actions_map';
import { WorkflowConflictError } from '../../common/lib/errors';

import { generateWorkflowId } from '../../common/lib/import';
import { validateWorkflowYaml } from '../../common/lib/validate_workflow_yaml';
import { updateWorkflowYamlFields } from '../../common/lib/yaml';
import { getWorkflowZodSchema } from '../../common/schema';
import type { BulkFailureEntry, BulkWorkflowEntry } from '../lib/bulk_id_helpers';
import {
  deduplicateUserIds,
  partitionByIdSource,
  removeConflictingIds,
} from '../lib/bulk_id_helpers';
import { getAuthenticatedUser } from '../lib/get_user';
import { hasScheduledTriggers } from '../lib/schedule_utils';
import { resolveUniqueWorkflowIds, validateWorkflowId } from '../lib/workflow_id_resolver';
import type { WorkflowProperties, WorkflowStorage } from '../storage/workflow_storage';
import { createStorage, workflowIndexName } from '../storage/workflow_storage';
import type { WorkflowTaskScheduler } from '../tasks/workflow_task_scheduler';
>>>>>>> 9.4
import type { WorkflowsServerPluginStartDeps } from '../types';
import type { WorkflowChangesHistoryResponse } from '../types/workflow_change_history';

export interface SearchExecutionsViewParams {
  query?: estypes.QueryDslQueryContainer;
  sort?: estypes.SortCombinations;
  from?: number;
  size?: number;
  trackTotalHits?: boolean;
  includeManagedExecutions?: boolean;
}

export interface SearchWorkflowExecutionsParams {
  workflowId?: string;
  statuses?: ExecutionStatus[];
  executionTypes?: ExecutionType[];
  executedBy?: string[];
  concurrencyGroupKey?: string;
  omitStepRuns?: boolean;
  finishedAfter?: string;
  finishedBefore?: string;
  collapse?: WorkflowExecutionCollapseField;
  sortField?: WorkflowExecutionSortField;
  sortOrder?: WorkflowExecutionSortOrder;
  page?: number;
  size?: number;
  /** Datemath lower bound for filtering by startedAt. */
  startedAfter?: string;
  /** Datemath upper bound for filtering by startedAt. */
  startedBefore?: string;
}

export class WorkflowsService {
  // The following attributes require `ensureInitialized` to be called before use
  private coreStart!: CoreStart;
  private pluginsStart!: WorkflowsServerPluginStartDeps;
  private workflowsExecutionEngine!: WorkflowsExecutionEnginePluginStart;
  private workflowsExtensions!: WorkflowsExtensionsServerPluginStart;
  private workflowStorage!: WorkflowStorage;
  private taskScheduler!: WorkflowTaskScheduler;
  private esClient!: ElasticsearchClient;
  private validationService!: WorkflowValidationService;
  private executionQueryService!: WorkflowExecutionQueryService;
  private searchService!: WorkflowSearchService;
  private crudService!: WorkflowCrudService;
  private managedWorkflowsService!: ManagedWorkflowsService;
  private workflowVersioningEnabled!: boolean;
  private readonly changeHistoryService: WorkflowChangeHistoryService;
  private getActionsClient!: () => Promise<IUnsecuredActionsClient>;
  private getActionsClientWithRequest!: (
    request: KibanaRequest
  ) => Promise<PublicMethodsOf<ActionsClient>>;

  private readonly initPromise: Promise<void>;

  constructor(
    startServices: StartServicesAccessor<WorkflowsServerPluginStartDeps>,
    private readonly logger: Logger,
    kibanaVersion: string
  ) {
    this.changeHistoryService = new WorkflowChangeHistoryService(logger, kibanaVersion);
    this.initPromise = this.initialize(startServices);
  }

  private async ensureInitialized(): Promise<void> {
    await this.initPromise;
  }

  private async initializeChangeHistoryService(coreStart: CoreStart): Promise<void> {
    if (coreStart.security) {
      await this.changeHistoryService.initialize({
        elasticsearchClient: coreStart.elasticsearch.client.asInternalUser,
        authService: coreStart.security.authc,
      });
      return;
    }

    this.logger.warn('Workflows Management: workflow change history is not initialized');
  }

  private async initialize(startServices: StartServicesAccessor<WorkflowsServerPluginStartDeps>) {
    const [coreStart, pluginsStart] = await startServices();
    this.coreStart = coreStart;
    this.pluginsStart = pluginsStart;
    this.esClient = coreStart.elasticsearch.client.asInternalUser;
    this.taskScheduler = new WorkflowTaskScheduler(this.logger, pluginsStart.taskManager);

    this.workflowStorage = createStorage({
      logger: this.logger,
      esClient: this.esClient,
    });

    this.workflowsExecutionEngine = pluginsStart.workflowsExecutionEngine;
    this.workflowsExtensions = pluginsStart.workflowsExtensions;

    this.getActionsClient = async () => pluginsStart.actions.getUnsecuredActionsClient();
    this.getActionsClientWithRequest = (request: KibanaRequest) =>
      pluginsStart.actions.getActionsClientWithRequest(request);

    this.validationService = new WorkflowValidationService({
      workflowsExtensions: this.workflowsExtensions,
      getActionsClient: this.getActionsClient,
      getActionsClientWithRequest: this.getActionsClientWithRequest,
    });

    this.executionQueryService = new WorkflowExecutionQueryService({
      logger: this.logger,
      esClient: this.esClient,
      workflowEventLoggerService: this.workflowsExecutionEngine.workflowEventLoggerService,
    });

    this.searchService = new WorkflowSearchService({
      logger: this.logger,
      workflowStorage: this.workflowStorage,
      esClient: this.esClient,
    });

    this.workflowVersioningEnabled = await readWorkflowVersioningEnabled(coreStart);

    if (this.workflowVersioningEnabled) {
      await this.initializeChangeHistoryService(coreStart);
    } else {
      this.logger.debug(
        'Workflow version history is disabled; skipping change-history data stream init'
      );
    }

    this.crudService = new WorkflowCrudService({
      logger: this.logger,
      esClient: this.esClient,
      workflowStorage: this.workflowStorage,
      getSecurity: () => this.coreStart.security,
      workflowsExtensions: this.workflowsExtensions,
      getTaskScheduler: () => this.taskScheduler,
      executionQueryService: this.executionQueryService,
      validationService: this.validationService,
      getCoreStart: () => this.coreStart,
      changeHistoryService: this.changeHistoryService,
      workflowVersioningEnabled: this.workflowVersioningEnabled,
    });

    this.managedWorkflowsService = new ManagedWorkflowsService({
      crudService: this.crudService,
      workflowsExecutionEngine: this.workflowsExecutionEngine,
      logger: this.logger,
    });
  }

  public async getWorkflowsExecutionEngine(): Promise<WorkflowsExecutionEnginePluginStart> {
    await this.ensureInitialized();
    return this.workflowsExecutionEngine;
  }

  public async getWorkflowsExtensions(): Promise<WorkflowsExtensionsServerPluginStart> {
    await this.ensureInitialized();
    return this.workflowsExtensions;
  }

  public async getCoreStart(): Promise<CoreStart> {
    await this.ensureInitialized();
    return this.coreStart;
  }

  public async getPluginsStart(): Promise<WorkflowsServerPluginStartDeps> {
    await this.ensureInitialized();
    return this.pluginsStart;
  }

  public async getWorkflow(
    id: string,
    spaceId: string,
    options?: { includeDeleted?: boolean }
  ): Promise<WorkflowDetailDto | null> {
    await this.ensureInitialized();
    return this.crudService.getWorkflow(id, spaceId, options);
  }

  public async getHistoryForWorkflow(
    id: string,
    spaceId: string,
    options?: { page?: number; perPage?: number }
  ): Promise<WorkflowChangesHistoryResponse> {
    await this.ensureInitialized();
    return getHistoryForWorkflow(
      {
        changeHistoryService: this.changeHistoryService,
        getWorkflow: (workflowId, sid) => this.crudService.getWorkflow(workflowId, sid),
        workflowVersioningEnabled: this.workflowVersioningEnabled,
      },
      { workflowId: id, spaceId, ...options }
    );
  }

  public async getWorkflowsByIds(
    ids: string[],
    spaceId: string,
    options?: { includeDeleted?: boolean }
  ): Promise<WorkflowDetailDto[]> {
    await this.ensureInitialized();
    return this.crudService.getWorkflowsByIds(ids, spaceId, options);
  }

  public async getWorkflowsSourceByIds(
    ids: string[],
    spaceId: string,
    source?: string[],
    options?: { includeDeleted?: boolean }
  ): Promise<WorkflowPartialDetailDto[]> {
<<<<<<< HEAD
    await this.ensureInitialized();
    return this.crudService.getWorkflowsSourceByIds(ids, spaceId, source, options);
=======
    if (!this.workflowStorage || ids.length === 0) {
      return [];
    }

    const response = await this.workflowStorage.getClient().search({
      query: {
        bool: {
          must: [{ ids: { values: ids } }, { term: { spaceId } }],
          must_not: [{ exists: { field: 'deleted_at' } }],
        },
      },
      _source: source ?? true,
      size: ids.length,
      track_total_hits: false,
    });

    return response.hits.hits.map((hit) =>
      this.transformStorageDocumentToWorkflowDto(hit._id, hit._source)
    );
  }

  /**
   * Parses and validates a workflow YAML, returning the prepared document and metadata.
   * Shared by createWorkflow and bulkCreateWorkflows.
   * When triggerDefinitions is provided, custom trigger on.condition values are validated
   * (valid KQL and only event schema properties).
   */
  private prepareWorkflowDocument(
    workflow: CreateWorkflowCommand,
    zodSchema: z.ZodType,
    authenticatedUser: string,
    now: Date,
    spaceId: string,
    triggerDefinitions?: Array<{ id: string; eventSchema: z.ZodType }>
  ): { id: string; workflowData: WorkflowProperties; definition?: WorkflowYaml } {
    let workflowToCreate: EsWorkflowCreate = {
      name: 'Untitled workflow',
      description: undefined,
      enabled: false,
      tags: [],
      definition: undefined,
      valid: false,
    };

    const validation = validateWorkflowYaml(workflow.yaml, zodSchema, { triggerDefinitions });
    if (validation.valid && validation.parsedWorkflow) {
      workflowToCreate = transformWorkflowYamlJsontoEsWorkflow(validation.parsedWorkflow);
    } else if (validation.parsedWorkflow) {
      workflowToCreate = transformWorkflowYamlJsontoEsWorkflow(validation.parsedWorkflow);
      workflowToCreate.valid = false;
      workflowToCreate.definition = undefined;
    }

    const id = workflow.id || generateWorkflowId(workflowToCreate.name);

    const workflowData: WorkflowProperties = {
      name: workflowToCreate.name,
      description: workflowToCreate.description,
      enabled: workflowToCreate.enabled,
      tags: workflowToCreate.tags || [],
      triggerTypes: getTriggerTypesFromDefinition(workflowToCreate.definition),
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
>>>>>>> 9.4
  }

  public async createWorkflow(
    workflow: CreateWorkflowCommand,
    spaceId: string,
    request: KibanaRequest
  ): Promise<WorkflowDetailDto> {
    await this.ensureInitialized();
<<<<<<< HEAD
    return this.crudService.createWorkflow(workflow, spaceId, request);
=======

    if (workflow.id) {
      validateWorkflowId(workflow.id);
    }

    const zodSchema = await this.getWorkflowZodSchema({ loose: false }, spaceId, request);
    const authenticatedUser = getAuthenticatedUser(request, this.security);
    const now = new Date();
    const triggerDefinitions = this.workflowsExtensions?.getAllTriggerDefinitions() ?? [];

    const {
      id: baseId,
      workflowData,
      definition,
    } = this.prepareWorkflowDocument(
      workflow,
      zodSchema,
      authenticatedUser,
      now,
      spaceId,
      triggerDefinitions
    );

    let id = baseId;
    if (workflow.id) {
      // User-supplied ID: fail on conflict (existing behaviour)
      const existingWorkflow = await this.getWorkflow(workflow.id, spaceId);
      if (existingWorkflow) {
        throw new WorkflowConflictError(
          `Workflow with id '${workflow.id}' already exists`,
          workflow.id
        );
      }
    } else {
      // Server-generated ID: resolve collisions with numeric suffix
      [id] = await resolveUniqueWorkflowIds([baseId], new Set(), (candidateIds) =>
        this.checkExistingIds(candidateIds, spaceId)
      );
    }

    await this.workflowStorage.getClient().index({
      id,
      document: workflowData,
      refresh: true,
    });

    await this.scheduleWorkflowTriggers(id, definition, spaceId, request);

    return this.transformStorageDocumentToWorkflowDto(id, workflowData);
>>>>>>> 9.4
  }

  /**
   * Creates multiple workflows in a single bulk operation.
   *
   * Note: with `overwrite: true`, concurrent calls targeting the same ID use
   * last-write-wins semantics (ES `index` operation). Both callers receive a
   * success response, but only the last write persists.
   */
  public async bulkCreateWorkflows(
    workflows: CreateWorkflowCommand[],
    spaceId: string,
    request: KibanaRequest,
    options?: { overwrite?: boolean }
<<<<<<< HEAD
  ): Promise<{ created: WorkflowDetailDto[]; failed: BulkFailureEntry[] }> {
    await this.ensureInitialized();
    return this.crudService.bulkCreateWorkflows(workflows, spaceId, request, options);
=======
  ): Promise<{
    created: WorkflowDetailDto[];
    failed: BulkFailureEntry[];
  }> {
    await this.ensureInitialized();

    const zodSchema = await this.getWorkflowZodSchema({ loose: false }, spaceId, request);
    const authenticatedUser = getAuthenticatedUser(request, this.security);
    const now = new Date();
    const triggerDefinitions = this.workflowsExtensions?.getAllTriggerDefinitions() ?? [];

    const created: WorkflowDetailDto[] = [];
    const failed: BulkFailureEntry[] = [];
    const validWorkflows: BulkWorkflowEntry[] = [];

    // Phase 1: Validate all workflows
    for (let i = 0; i < workflows.length; i++) {
      try {
        const customId = workflows[i].id;
        if (customId) {
          validateWorkflowId(customId);
        }
        const prepared = this.prepareWorkflowDocument(
          workflows[i],
          zodSchema,
          authenticatedUser,
          now,
          spaceId,
          triggerDefinitions
        );

        validWorkflows.push({
          idx: i,
          id: prepared.id,
          idSource: workflows[i].id ? 'user-supplied' : 'server-generated',
          workflowData: prepared.workflowData,
          definition: prepared.definition,
        });
      } catch (error) {
        failed.push({
          index: i,
          id: workflows[i].id ?? `unknown-${i}`,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Phase 1.5: Resolve IDs — deduplicate in-batch and check database for collisions.
    const overwrite = options?.overwrite ?? false;
    const { resolvedWorkflows, failures } = await this.resolveAndDeduplicateBulkIds(
      validWorkflows,
      overwrite,
      spaceId
    );
    failed.push(...failures);

    // Build bulk operations from resolved workflows
    const bulkOperations = resolvedWorkflows.map((vw) =>
      overwrite
        ? { index: { _id: vw.id, document: vw.workflowData } }
        : { create: { _id: vw.id, document: vw.workflowData } }
    );

    // Phase 2: Bulk write all valid workflows
    if (bulkOperations.length > 0) {
      const bulkResponse = await this.workflowStorage.getClient().bulk({
        operations: bulkOperations,
        refresh: 'wait_for',
      });

      // Process bulk response
      for (let itemIndex = 0; itemIndex < bulkResponse.items.length; itemIndex++) {
        const item = bulkResponse.items[itemIndex];
        const operation = item.index ?? item.create;
        const resolvedWorkflow = resolvedWorkflows[itemIndex];

        if (operation?.error) {
          failed.push({
            index: resolvedWorkflow.idx,
            id: resolvedWorkflow.id,
            error:
              typeof operation.error === 'object' && 'reason' in operation.error
                ? operation.error.reason ?? JSON.stringify(operation.error)
                : JSON.stringify(operation.error),
          });
        } else {
          created.push(
            this.transformStorageDocumentToWorkflowDto(
              resolvedWorkflow.id,
              resolvedWorkflow.workflowData
            )
          );
        }
      }
    }

    // Phase 3: Schedule triggers for successfully created workflows (in parallel)
    const createdIds = new Set(created.map((w) => w.id));
    const workflowsToSchedule = resolvedWorkflows.filter(
      (vw) => createdIds.has(vw.id) && vw.definition?.triggers?.some((t) => t.type === 'scheduled')
    );

    await Promise.allSettled(
      workflowsToSchedule.map((vw) =>
        this.scheduleWorkflowTriggers(vw.id, vw.definition, spaceId, request)
      )
    );

    return { created, failed };
  }

  /**
   * Fetches the workflow document by id and spaceId, or throws if not found.
   */
  private async getExistingWorkflowDocument(
    id: string,
    spaceId: string
  ): Promise<{ source: WorkflowProperties }> {
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

    const hit = searchResponse.hits.hits[0];
    if (!hit._source) {
      throw new Error(`Workflow with id ${id} not found`);
    }
    return { source: hit._source as WorkflowProperties };
  }

  /**
   * Validates workflow YAML and produces the update patch and validation errors.
   * Used by updateWorkflow when workflow.yaml is provided.
   */
  private async applyYamlUpdate(
    workflowYaml: string,
    spaceId: string,
    request: KibanaRequest
  ): Promise<{
    updatedDataPatch: Partial<WorkflowProperties>;
    validationErrors: string[];
    shouldUpdateScheduler: boolean;
  }> {
    const zodSchema = await this.getWorkflowZodSchema({ loose: false }, spaceId, request);
    const triggerDefinitions = this.workflowsExtensions?.getAllTriggerDefinitions() ?? [];
    const validation = validateWorkflowYaml(workflowYaml, zodSchema, { triggerDefinitions });

    if (!validation.valid || !validation.parsedWorkflow) {
      return {
        updatedDataPatch: { definition: undefined, enabled: false, valid: false, triggerTypes: [] },
        validationErrors: validation.diagnostics
          .filter((d) => d.severity === 'error')
          .map((d) => d.message),
        shouldUpdateScheduler: true,
      };
    }

    const workflowDef = transformWorkflowYamlJsontoEsWorkflow(validation.parsedWorkflow);
    return {
      updatedDataPatch: {
        definition: workflowDef.definition,
        name: workflowDef.name,
        enabled: workflowDef.enabled,
        description: workflowDef.description,
        tags: workflowDef.tags,
        triggerTypes: getTriggerTypesFromDefinition(workflowDef.definition),
        valid: true,
        yaml: workflowYaml,
      },
      validationErrors: [],
      shouldUpdateScheduler: true,
    };
  }

  /**
   * Builds the update patch when only individual fields (name, enabled, description, tags) are updated.
   * Used by updateWorkflow when workflow.yaml is not provided.
   */
  private applyFieldUpdates(
    workflow: Partial<EsWorkflow>,
    existingSource: WorkflowProperties
  ): Partial<WorkflowProperties> {
    const patch: Partial<WorkflowProperties> = {};
    let yamlUpdated = false;

    if (workflow.name !== undefined) {
      patch.name = workflow.name;
      yamlUpdated = true;
    }
    if (workflow.enabled !== undefined) {
      if (workflow.enabled && existingSource?.definition) {
        patch.enabled = true;
      } else if (!workflow.enabled) {
        patch.enabled = false;
      }
      yamlUpdated = true;
    }
    if (workflow.description !== undefined) {
      patch.description = workflow.description;
      yamlUpdated = true;
    }
    if (workflow.tags !== undefined) {
      patch.tags = workflow.tags;
      yamlUpdated = true;
    }

    if (yamlUpdated && existingSource?.yaml) {
      patch.yaml = updateWorkflowYamlFields(
        existingSource.yaml,
        workflow,
        patch.enabled ?? existingSource.enabled
      );
    }

    return patch;
  }

  /**
   * Updates or removes scheduled tasks after a workflow document is saved.
   * Call only when shouldUpdateScheduler is true and taskScheduler is set.
   */
  private async updateSchedulerAfterWorkflowSave(
    id: string,
    spaceId: string,
    request: KibanaRequest,
    finalData: WorkflowProperties
  ): Promise<void> {
    if (!this.taskScheduler) return;

    const workflowIsSchedulable = finalData.definition && finalData.valid && finalData.enabled;
    if (!workflowIsSchedulable) {
      await this.taskScheduler.unscheduleWorkflowTasks(id);
      this.logger.debug(
        `Removed all scheduled tasks for workflow ${id} (workflow disabled or invalid)`
      );
      return;
    }

    const triggers = finalData.definition?.triggers ?? [];
    const workflowHasScheduledTriggers = hasScheduledTriggers(triggers);
    if (!workflowHasScheduledTriggers) {
      await this.taskScheduler.unscheduleWorkflowTasks(id);
      this.logger.debug(`Removed scheduled tasks for workflow ${id} (no scheduled triggers)`);
      return;
    }

    const updatedWorkflow = await this.getWorkflow(id, spaceId);
    if (!updatedWorkflow?.definition) return;

    const workflowForScheduler: EsWorkflow = {
      ...updatedWorkflow,
      definition: updatedWorkflow.definition,
      tags: [],
      deleted_at: null,
      createdAt: new Date(updatedWorkflow.createdAt),
      lastUpdatedAt: new Date(updatedWorkflow.lastUpdatedAt),
    };
    await this.taskScheduler.updateWorkflowTasks(workflowForScheduler, spaceId, request);
    this.logger.debug(`Updated scheduled tasks for workflow ${id}`);
>>>>>>> 9.4
  }

  public async updateWorkflow(
    id: string,
    workflow: Partial<EsWorkflow>,
    spaceId: string,
    request: KibanaRequest
  ): Promise<UpdatedWorkflowResponseDto> {
    await this.ensureInitialized();
    return this.crudService.updateWorkflow(id, workflow, spaceId, request);
  }

  public async deleteWorkflows(
    ids: string[],
    spaceId: string,
    options?: { force?: boolean }
  ): Promise<DeleteWorkflowsResponse> {
    await this.ensureInitialized();
    return this.crudService.deleteWorkflows(ids, spaceId, options);
  }

  /**
   * Disables all enabled workflows. When `spaceId` is set, only workflows in that
   * space; otherwise across all spaces. Delegated to {@link WorkflowCrudService},
   * which sets `enabled: false`, patches YAML accordingly, and unschedules any
   * scheduled tasks.
   * Used when a user opts out of workflows by toggling the per-space UI setting
   * off, or when availability (license / config) requires a global bulk disable.
   */
  public async disableAllWorkflows(spaceId?: string): Promise<{
    total: number;
    disabled: number;
    failures: Array<{ id: string; error: string }>;
  }> {
    await this.ensureInitialized();
    return this.crudService.disableAllWorkflows(spaceId);
  }

  public async getWorkflowsSubscribedToTrigger(
    triggerId: string,
    spaceId: string
  ): Promise<WorkflowDetailDto[]> {
    await this.ensureInitialized();
    return this.searchService.getWorkflowsSubscribedToTrigger(triggerId, spaceId);
  }

  public async getWorkflows(
    params: GetWorkflowsParams,
    spaceId: string,
    options?: { includeExecutionHistory?: boolean; includeManagedExecutionHistory?: boolean }
  ): Promise<WorkflowListDto> {
    await this.ensureInitialized();
    return this.searchService.getWorkflows(params, spaceId, options);
  }

  public async getWorkflowStats(
    spaceId: string,
    options?: { includeExecutionStats?: boolean; includeManagedExecutionStats?: boolean }
  ): Promise<WorkflowStatsDto> {
    await this.ensureInitialized();
    return this.searchService.getWorkflowStats(spaceId, options);
  }

  public async getWorkflowAggs(
    fields: string[],
    spaceId: string,
    options?: GetWorkflowAggsOptions
  ): Promise<WorkflowAggsDto> {
    await this.ensureInitialized();
    return options
      ? this.searchService.getWorkflowAggs(fields, spaceId, options)
      : this.searchService.getWorkflowAggs(fields, spaceId);
  }

  public async getWorkflowExecution(
    executionId: string,
    spaceId: string,
    options?: { includeInput?: boolean; includeOutput?: boolean }
  ): Promise<WorkflowExecutionDto | null> {
    await this.ensureInitialized();
    return this.executionQueryService.getWorkflowExecution(executionId, spaceId, options);
  }

  public async getChildWorkflowExecutions(
    parentExecutionId: string,
    spaceId: string
  ): Promise<ChildWorkflowExecutionItem[]> {
    await this.ensureInitialized();
    return this.executionQueryService.getChildWorkflowExecutions(parentExecutionId, spaceId);
  }

  public async getWorkflowExecutions(
    params: SearchWorkflowExecutionsParams,
    spaceId: string
  ): Promise<WorkflowExecutionListDto> {
    await this.ensureInitialized();
    return this.executionQueryService.getWorkflowExecutions(params, spaceId);
  }

  public async searchExecutionsView(
    params: SearchExecutionsViewParams,
    spaceId: string
  ): Promise<estypes.SearchResponse<unknown>> {
    await this.ensureInitialized();
    return this.executionQueryService.searchExecutionsView(params, spaceId);
  }

  public async listWaitingForInputSteps(
    spaceId: string,
    pagination: { page?: number; perPage?: number } = {}
  ): Promise<{ results: EsWorkflowStepExecution[]; total: number }> {
    await this.ensureInitialized();
    return this.executionQueryService.listWaitingForInputSteps(spaceId, pagination);
  }

  public async getWorkflowExecutionHistory(
    executionId: string,
    spaceId: string
  ): Promise<WorkflowExecutionHistoryModel[]> {
    await this.ensureInitialized();
    return this.executionQueryService.getWorkflowExecutionHistory(executionId, spaceId);
  }

  public async getStepExecutions(params: GetStepExecutionParams, spaceId: string) {
    await this.ensureInitialized();
    return this.executionQueryService.getStepExecutions(params, spaceId);
  }

  public async searchStepExecutions(
    params: SearchStepExecutionsParams,
    spaceId: string
  ): Promise<StepExecutionListResult> {
    await this.ensureInitialized();
    return this.executionQueryService.searchStepExecutions(params, spaceId);
  }

  public async getExecutionLogs(params: ExecutionLogsParams): Promise<LogSearchResult> {
    await this.ensureInitialized();
    return this.executionQueryService.getExecutionLogs(params);
  }

  public async getStepLogs(params: StepLogsParams): Promise<LogSearchResult> {
    await this.ensureInitialized();
    return this.executionQueryService.getStepLogs(params);
  }

  public async getStepExecution(
    params: GetStepExecutionParams,
    spaceId: string
  ): Promise<EsWorkflowStepExecution | null> {
<<<<<<< HEAD
    await this.ensureInitialized();
    return this.executionQueryService.getStepExecution(params, spaceId);
=======
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

  /**
   * Phase 1.5 of bulkCreateWorkflows: resolves server-generated IDs against the
   * database and in-batch collisions, checks user-supplied IDs for conflicts,
   * and deduplicates within the batch.
   *
   * Returns the filtered list of workflows (with resolved IDs) and any failures.
   */
  private async resolveAndDeduplicateBulkIds(
    validWorkflows: readonly BulkWorkflowEntry[],
    overwrite: boolean,
    spaceId: string
  ): Promise<{
    resolvedWorkflows: BulkWorkflowEntry[];
    failures: BulkFailureEntry[];
  }> {
    const failures: BulkFailureEntry[] = [];

    // Separate server-generated IDs (need collision resolution) from user-supplied IDs.
    // User-supplied IDs are reserved in seenIds first so that server-generated resolution
    // routes around them — explicit user IDs always take priority.
    const { serverGenerated, userSupplied } = partitionByIdSource(validWorkflows);
    const seenIds = new Set<string>(userSupplied.map((wf) => wf.id));

    // For server-generated IDs: resolve unique IDs in batch
    // (handles both in-batch dedup and database collision avoidance)
    let resolvedServerGen = serverGenerated;
    if (serverGenerated.length > 0) {
      const resolvedIds = await resolveUniqueWorkflowIds(
        serverGenerated.map((wf) => wf.id),
        seenIds,
        (candidateIds) => this.checkExistingIds(candidateIds, spaceId)
      );
      resolvedServerGen = serverGenerated.map((wf, i) => ({ ...wf, id: resolvedIds[i] }));
    }

    // Reassemble in original order with resolved server-generated IDs
    const resolvedById = new Map(resolvedServerGen.map((wf, i) => [serverGenerated[i], wf]));
    let workflows: BulkWorkflowEntry[] = validWorkflows.map((wf) => resolvedById.get(wf) ?? wf);

    // For user-supplied IDs with overwrite: false — best-effort check for conflicts in the
    // database. The ES `create` operation in the bulk call is the real atomicity guarantee;
    // this pre-check provides a cleaner error message when a conflict is detected early.
    if (!overwrite && userSupplied.length > 0) {
      const existingUserIds = await this.checkExistingIds(
        userSupplied.map((wf) => wf.id),
        spaceId
      );
      const conflictResult = removeConflictingIds(workflows, existingUserIds);
      workflows = conflictResult.kept;
      failures.push(...conflictResult.removed);
    }

    // Deduplicate user-supplied IDs within the batch (first wins, later ones fail).
    // Server-generated IDs are already guaranteed unique by resolveUniqueWorkflowIds.
    const dedupResult = deduplicateUserIds(workflows);
    workflows = dedupResult.kept;
    failures.push(...dedupResult.removed);

    return { resolvedWorkflows: workflows, failures };
  }

  /**
   * Checks which of the given IDs already exist in the given space.
   * Returns the set of IDs that exist.
   *
   * Intentionally includes soft-deleted workflows (no must_not deleted_at filter)
   * to prevent reassigning an ID that belongs to a soft-deleted workflow.
   */
  private async checkExistingIds(ids: string[], spaceId: string): Promise<Set<string>> {
    if (ids.length === 0) {
      return new Set();
    }

    const response = await this.workflowStorage.getClient().search({
      query: {
        bool: {
          must: [{ ids: { values: ids } }, { term: { spaceId } }],
        },
      },
      size: ids.length,
      track_total_hits: false,
    });

    return new Set(response.hits.hits.map((hit) => hit._id).filter((id): id is string => !!id));
>>>>>>> 9.4
  }

  public async getAvailableConnectors(
    spaceId: string,
    request: KibanaRequest
  ): Promise<GetAvailableConnectorsResponse> {
    await this.ensureInitialized();
    return this.validationService.getAvailableConnectors(spaceId, request);
  }

  public async getRegisteredCustomTriggerDefinitions(): Promise<ServerTriggerDefinition[]> {
    await this.ensureInitialized();
    return this.validationService.getRegisteredCustomTriggerDefinitions();
  }

  public async validateWorkflow(
    yaml: string,
    spaceId: string,
    request: KibanaRequest
  ): Promise<ValidateWorkflowResponseDto> {
    await this.ensureInitialized();
    return this.validationService.validateWorkflow(yaml, spaceId, request);
  }

  public async getWorkflowZodSchema(
    options: { loose?: false },
    spaceId: string,
    request: KibanaRequest
  ): Promise<z.ZodType> {
    await this.ensureInitialized();
    return this.validationService.getWorkflowZodSchema(options, spaceId, request);
  }

  public async installManagedWorkflow(
    id: ManagedWorkflowId,
    options: ManagedWorkflowServiceInstallOptions,
    registeredPluginId: string
  ): Promise<void> {
    await this.ensureInitialized();
    return this.managedWorkflowsService.installManagedWorkflow(id, options, registeredPluginId);
  }

  public async uninstallManagedWorkflow(
    id: ManagedWorkflowId,
    options: ManagedWorkflowOperationOptions,
    registeredPluginId: string
  ): Promise<void> {
    await this.ensureInitialized();
    return this.managedWorkflowsService.uninstallManagedWorkflow(id, options, registeredPluginId);
  }

  public async getManagedWorkflowStatus(
    id: ManagedWorkflowId,
    options: GetManagedWorkflowStatusOptions,
    registeredPluginId: string
  ): Promise<ManagedWorkflowStatusReport> {
    await this.ensureInitialized();
    return this.managedWorkflowsService.getManagedWorkflowStatus(id, options, registeredPluginId);
  }

  public async executeManagedWorkflow(
    id: ManagedWorkflowId,
    request: KibanaRequest,
    options: ExecuteManagedWorkflowOptions,
    registeredPluginId: string
  ): Promise<string> {
    await this.ensureInitialized();
    return this.managedWorkflowsService.executeManagedWorkflow(
      id,
      request,
      options,
      registeredPluginId
    );
  }

  public async pluginReady(pluginId: string): Promise<void> {
    await this.ensureInitialized();
    return this.managedWorkflowsService.pluginReady(pluginId);
  }

  public async cleanupUnregisteredOrphans(registeredOwnerPluginIds: string[]): Promise<void> {
    await this.ensureInitialized();
    return this.managedWorkflowsService.cleanupUnregisteredOrphans(registeredOwnerPluginIds);
  }
}
