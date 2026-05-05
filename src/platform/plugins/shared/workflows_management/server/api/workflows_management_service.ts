/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import { WorkflowsConnectorFeatureId } from '@kbn/actions-plugin/common/connector_feature_config';
import type { ActionsPlugin, FindActionResult } from '@kbn/actions-plugin/server/types';
import type {
  CoreStart,
  ElasticsearchClient,
  KibanaRequest,
  Logger,
  StartServicesAccessor,
} from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import {
  ExecutionType,
  NonTerminalExecutionStatuses,
  transformWorkflowYamlJsontoEsWorkflow,
} from '@kbn/workflows';
import type {
  ConnectorTypeInfo,
  CreateWorkflowCommand,
  EsWorkflow,
  EsWorkflowCreate,
  EsWorkflowExecution,
  EsWorkflowStepExecution,
  ExecutionStatus,
  UpdatedWorkflowResponseDto,
  ValidateWorkflowResponseDto,
  WorkflowAggsDto,
  WorkflowDetailDto,
  WorkflowExecutionDto,
  WorkflowExecutionHistoryModel,
  WorkflowExecutionListDto,
  WorkflowListDto,
  WorkflowStatsDto,
  WorkflowYaml,
} from '@kbn/workflows';
import type {
  ChildWorkflowExecutionItem,
  ConnectorInstanceConfig,
  GetAvailableConnectorsResponse,
  WorkflowListItemDto,
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
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import { parseYamlToJSONWithoutValidation, WorkflowConflictError } from '@kbn/workflows-yaml';
import type { z } from '@kbn/zod/v4';

import { getChildWorkflowExecutions } from './lib/get_child_workflow_executions';
import { getWorkflowExecution } from './lib/get_workflow_execution';
import { searchStepExecutions, type StepExecutionListResult } from './lib/search_step_executions';
import { searchWorkflowExecutions } from './lib/search_workflow_executions';

import type {
  DeleteWorkflowsResponse,
  GetStepExecutionParams,
  GetWorkflowsParams,
  SearchStepExecutionsParams,
} from './workflows_management_api';
import { WORKFLOWS_EXECUTIONS_INDEX, WORKFLOWS_STEP_EXECUTIONS_INDEX } from '../../common';
import { CONNECTOR_SUB_ACTIONS_MAP } from '../../common/connector_sub_actions_map';

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
import { WorkflowTaskScheduler } from '../tasks/workflow_task_scheduler';
import type { WorkflowsServerPluginStartDeps } from '../types';

/** Derives a list of trigger type ids from a workflow definition (e.g. ['manual', 'scheduled', 'cases.updated']). */
function getTriggerTypesFromDefinition(definition: WorkflowYaml | null | undefined): string[] {
  const triggers = definition?.triggers ?? [];
  return triggers
    .map((t) => (t && typeof t.type === 'string' ? t.type : null))
    .filter(<T>(v: T): v is NonNullable<T> => v != null);
}

/** True when the YAML root map includes `enabled` (before Zod defaults). */
function workflowYamlDeclaresTopLevelEnabled(yamlString: string): boolean {
  const parsed = parseYamlToJSONWithoutValidation(yamlString);
  if (!parsed.success || parsed.json == null || typeof parsed.json !== 'object') {
    return false;
  }
  return Object.prototype.hasOwnProperty.call(parsed.json, 'enabled');
}

const DEFAULT_PAGE_SIZE = 100;

type WorkflowStorageClient = ReturnType<WorkflowStorage['getClient']>;

export interface SearchWorkflowExecutionsParams {
  workflowId: string;
  statuses?: ExecutionStatus[];
  executionTypes?: ExecutionType[];
  executedBy?: string[];
  omitStepRuns?: boolean;
  page?: number;
  size?: number;
}

export class WorkflowsService {
  // The following attributes require `ensureInitialized` to be called before use
  private coreStart!: CoreStart;
  private pluginsStart!: WorkflowsServerPluginStartDeps;
  private workflowsExecutionEngine!: WorkflowsExecutionEnginePluginStart;
  private workflowStorage!: WorkflowStorage;
  private taskScheduler!: WorkflowTaskScheduler;
  private esClient!: ElasticsearchClient;
  private actions!: ActionsPlugin['start'];
  private workflowsExtensions!: WorkflowsExtensionsServerPluginStart;

  private readonly initPromise: Promise<void>;

  constructor(
    startServices: StartServicesAccessor<WorkflowsServerPluginStartDeps>,
    private readonly logger: Logger
  ) {
    this.initPromise = this.initialize(startServices);
  }

  private async ensureInitialized(): Promise<void> {
    await this.initPromise;
  }

  private async initialize(startServices: StartServicesAccessor<WorkflowsServerPluginStartDeps>) {
    const [coreStart, pluginsStart] = await startServices();
    this.coreStart = coreStart;
    this.pluginsStart = pluginsStart;
    this.taskScheduler = new WorkflowTaskScheduler(this.logger, pluginsStart.taskManager);

    this.actions = pluginsStart.actions;
    this.esClient = coreStart.elasticsearch.client.asInternalUser;

    this.workflowStorage = createStorage({
      logger: this.logger,
      esClient: this.esClient,
    });

    this.workflowsExecutionEngine = pluginsStart.workflowsExecutionEngine;
    this.workflowsExtensions = pluginsStart.workflowsExtensions;
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

  public async getWorkflow(id: string, spaceId: string): Promise<WorkflowDetailDto | null> {
    await this.ensureInitialized();

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
   * Fetches multiple workflows by their IDs in a single Elasticsearch request.
   * Returns only the workflows that were found (missing IDs are silently omitted).
   */
  public async getWorkflowsByIds(ids: string[], spaceId: string): Promise<WorkflowDetailDto[]> {
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
      size: ids.length,
      track_total_hits: false,
    });

    return response.hits.hits.map((hit) =>
      this.transformStorageDocumentToWorkflowDto(hit._id, hit._source)
    );
  }

  /**
   * Checks which of the given workflow IDs already exist in the specified space.
   * Returns an array of `{ id, name }` for each existing workflow, suitable for
   * conflict detection during import.
   */
  public async getWorkflowsSourceByIds(
    ids: string[],
    spaceId: string,
    source?: string[]
  ): Promise<WorkflowPartialDetailDto[]> {
    await this.ensureInitialized();

    if (ids.length === 0) {
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
  }

  public async createWorkflow(
    workflow: CreateWorkflowCommand,
    spaceId: string,
    request: KibanaRequest
  ): Promise<WorkflowDetailDto> {
    await this.ensureInitialized();

    if (workflow.id) {
      validateWorkflowId(workflow.id);
    }

    const zodSchema = await this.getWorkflowZodSchema({ loose: false }, spaceId, request);
    const authenticatedUser = getAuthenticatedUser(request, this.coreStart.security);
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
  ): Promise<{
    created: WorkflowDetailDto[];
    failed: BulkFailureEntry[];
  }> {
    await this.ensureInitialized();

    const zodSchema = await this.getWorkflowZodSchema({ loose: false }, spaceId, request);
    const authenticatedUser = getAuthenticatedUser(request, this.coreStart.security);
    const now = new Date();
    const triggerDefinitions = this.workflowsExtensions.getAllTriggerDefinitions();

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
    await this.ensureInitialized();

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
    await this.ensureInitialized();

    const zodSchema = await this.getWorkflowZodSchema({ loose: false }, spaceId, request);
    const triggerDefinitions = this.workflowsExtensions.getAllTriggerDefinitions();
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
  }

  public async updateWorkflow(
    id: string,
    workflow: Partial<EsWorkflow>,
    spaceId: string,
    request: KibanaRequest
  ): Promise<UpdatedWorkflowResponseDto> {
    await this.ensureInitialized();

    try {
      const { source: existingSource } = await this.getExistingWorkflowDocument(id, spaceId);
      const authenticatedUser = getAuthenticatedUser(request, this.coreStart.security);
      const now = new Date();
      const validationErrors: string[] = [];
      let updatedData: Partial<WorkflowProperties> = {
        lastUpdatedBy: authenticatedUser,
        updated_at: now.toISOString(),
      };

      let shouldUpdateScheduler =
        workflow.enabled !== undefined && workflow.enabled !== existingSource.enabled;

      if (workflow.yaml) {
        const yamlResult = await this.applyYamlUpdate(workflow.yaml, spaceId, request);
        // Always persist the submitted yaml (draft) even when validation fails
        updatedData = { ...updatedData, yaml: workflow.yaml, ...yamlResult.updatedDataPatch };
        validationErrors.push(...yamlResult.validationErrors);
        shouldUpdateScheduler = shouldUpdateScheduler || yamlResult.shouldUpdateScheduler;

        // Zod may default `enabled` to true when YAML omits it; do not overwrite stored or request values.
        if (
          yamlResult.validationErrors.length === 0 &&
          yamlResult.updatedDataPatch.valid &&
          updatedData.definition &&
          !workflowYamlDeclaresTopLevelEnabled(workflow.yaml)
        ) {
          const resolvedEnabled =
            workflow.enabled !== undefined ? workflow.enabled : existingSource.enabled;
          updatedData.enabled = resolvedEnabled;
          updatedData.definition = {
            ...updatedData.definition,
            enabled: resolvedEnabled,
          } as WorkflowYaml;
        }
      } else {
        updatedData = { ...updatedData, ...this.applyFieldUpdates(workflow, existingSource) };
      }

      const finalData: WorkflowProperties = { ...existingSource, ...updatedData };
      if (finalData.triggerTypes === undefined) {
        finalData.triggerTypes = getTriggerTypesFromDefinition(finalData.definition) ?? [];
      }

      await this.workflowStorage.getClient().index({
        id,
        document: finalData,
        refresh: true,
      });

      if (shouldUpdateScheduler && this.taskScheduler) {
        await this.updateSchedulerAfterWorkflowSave(id, spaceId, request, finalData);
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

  public async deleteWorkflows(
    ids: string[],
    spaceId: string,
    options?: { force?: boolean }
  ): Promise<DeleteWorkflowsResponse> {
    await this.ensureInitialized();

    const force = options?.force ?? false;
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

    const hits = searchResponse.hits.hits;

    if (force) {
      return this.hardDeleteWorkflows(ids, hits, client, spaceId, failures);
    }

    return this.softDeleteWorkflows(ids, hits, client, failures);
  }

  private async hardDeleteWorkflows(
    ids: string[],
    hits: Array<{ _id?: string; _source?: WorkflowProperties }>,
    client: WorkflowStorageClient,
    spaceId: string,
    failures: Array<{ id: string; error: string }>
  ): Promise<DeleteWorkflowsResponse> {
    const foundIds = hits.map((hit) => hit._id).filter(Boolean) as string[];

    // Phase 1: Disable enabled workflows to prevent new executions from being
    // created between the running-execution check and the actual delete
    // (closes the TOCTOU race window).
    const disabledIds = await this.disableWorkflowsForDeletion(hits, client);

    // Phase 2: Check for running executions
    const runningIds: string[] = [];
    for (const id of foundIds) {
      const executions = await this.getWorkflowExecutions(
        { workflowId: id, statuses: [...NonTerminalExecutionStatuses], size: 1 },
        spaceId
      );
      if (executions.total > 0) {
        runningIds.push(id);
      }
    }
    if (runningIds.length > 0) {
      await this.restoreDisabledWorkflows(hits, disabledIds, client);
      throw new WorkflowConflictError(
        `Cannot force-delete workflows with running executions: [${runningIds.join(', ')}]`,
        runningIds[0]
      );
    }

    // Phase 3: Delete workflow documents
    const successfulIds: string[] = [];
    for (const id of foundIds) {
      try {
        await client.delete({ id });
        successfulIds.push(id);
      } catch (error) {
        failures.push({
          id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Phase 4: Cleanup
    await this.unscheduleDeletedWorkflowTasks(successfulIds);
    await this.purgeWorkflowRelatedData(successfulIds, spaceId);

    return {
      total: ids.length,
      deleted: ids.length - failures.length,
      failures,
      successfulIds,
    };
  }

  /**
   * Disables enabled workflows before hard-deletion to prevent new executions
   * from being accepted while the delete is in progress.
   * Returns the IDs of workflows that were actually disabled (were previously enabled).
   */
  private async disableWorkflowsForDeletion(
    hits: Array<{ _id?: string; _source?: WorkflowProperties }>,
    client: WorkflowStorageClient
  ): Promise<string[]> {
    const disableOperations = hits
      .filter(
        (hit): hit is { _id: string; _source: WorkflowProperties } =>
          Boolean(hit._id) && Boolean(hit._source) && hit._source?.enabled === true
      )
      .map((hit) => {
        return {
          index: {
            _id: hit._id,
            document: {
              ...(hit._source satisfies WorkflowProperties),
              enabled: false,
            },
          },
        };
      });

    if (disableOperations.length > 0) {
      const response = await client.bulk({ operations: disableOperations, refresh: true });
      return disableOperations
        .filter((_, i) => {
          const status = response.items[i]?.index?.status ?? 0;
          return status >= 200 && status < 300;
        })
        .map((op) => op.index._id);
    }

    return [];
  }

  /**
   * Re-enables workflows that were disabled during a hard-delete attempt
   * that was aborted due to running executions.
   */
  private async restoreDisabledWorkflows(
    hits: Array<{ _id?: string; _source?: WorkflowProperties }>,
    disabledIds: string[],
    client: WorkflowStorageClient
  ): Promise<void> {
    if (disabledIds.length === 0) {
      return;
    }

    const restoreOperations = hits
      .filter(
        (hit): hit is { _id: string; _source: WorkflowProperties } =>
          Boolean(hit._id) && Boolean(hit._source) && disabledIds.includes(String(hit._id))
      )
      .map((hit) => ({
        index: {
          _id: hit._id,
          document: hit._source satisfies WorkflowProperties,
        },
      }));

    if (restoreOperations.length > 0) {
      try {
        await client.bulk({ operations: restoreOperations, refresh: true });
      } catch (error) {
        this.logger.warn(
          `Failed to restore disabled workflows after hard-delete conflict: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
  }

  /**
   * Permanently removes all execution history and step executions
   * associated with the given workflow IDs within the specified space.
   * Used during hard (force) delete so the workflow ID can be fully reused.
   */
  private async purgeWorkflowRelatedData(workflowIds: string[], spaceId: string): Promise<void> {
    if (workflowIds.length === 0) {
      return;
    }

    const query = {
      bool: {
        must: [{ terms: { workflowId: workflowIds } }, { term: { spaceId } }],
      },
    };

    const deleteOps = [
      this.esClient
        .deleteByQuery({
          index: WORKFLOWS_EXECUTIONS_INDEX,
          query,
          refresh: true,
          conflicts: 'proceed',
        })
        .catch((error) => {
          this.logger.warn(
            `Failed to purge executions for workflows [${workflowIds.join(', ')}]: ${error.message}`
          );
        }),
      this.esClient
        .deleteByQuery({
          index: WORKFLOWS_STEP_EXECUTIONS_INDEX,
          query,
          refresh: true,
          conflicts: 'proceed',
        })
        .catch((error) => {
          this.logger.warn(
            `Failed to purge step executions for workflows [${workflowIds.join(', ')}]: ${
              error.message
            }`
          );
        }),
    ];

    await Promise.allSettled(deleteOps);
  }

  private async softDeleteWorkflows(
    ids: string[],
    hits: Array<{ _id?: string; _source?: WorkflowProperties }>,
    client: WorkflowStorageClient,
    failures: Array<{ id: string; error: string }>
  ): Promise<DeleteWorkflowsResponse> {
    const now = new Date();
    const successfulIds: string[] = [];

    const bulkOperations = hits.map((hit) => ({
      index: {
        _id: hit._id,
        document: {
          ...(hit._source as WorkflowProperties),
          deleted_at: now,
          enabled: false,
        },
      },
    }));

    if (bulkOperations.length > 0) {
      try {
        const bulkResponse = await client.bulk({
          operations: bulkOperations,
          refresh: true,
        });

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
          } else if (operation?._id) {
            successfulIds.push(operation._id);
          }
        });

        await this.unscheduleDeletedWorkflowTasks(successfulIds);
      } catch (error) {
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
      successfulIds,
    };
  }

  private async unscheduleDeletedWorkflowTasks(successfulIds: string[]): Promise<void> {
    if (this.taskScheduler && successfulIds.length > 0) {
      const results = await Promise.allSettled(
        successfulIds.map((workflowId) => this.taskScheduler?.unscheduleWorkflowTasks(workflowId))
      );
      results.forEach((result, i) => {
        if (result.status === 'rejected') {
          this.logger.warn(
            `Failed to unschedule tasks for deleted workflow ${successfulIds[i]}: ${result.reason}`
          );
        }
      });
    }
  }

  /**
   * Disables all enabled workflows. When `spaceId` is set, only workflows in that space;
   * otherwise across all spaces. Sets `enabled: false`, patches YAML accordingly, and
   * unschedules any scheduled tasks.
   * Used when a user opts out of workflows by toggling the per-space UI setting off, or
   * when availability (license / config) requires bulk disable.
   */
  public async disableAllWorkflows(spaceId?: string): Promise<{
    total: number;
    disabled: number;
    failures: Array<{ id: string; error: string }>;
  }> {
    await this.ensureInitialized();

    const client = this.workflowStorage.getClient();
    const pageSize = 1000;
    const MAX_PAGES = 50;
    const failures: Array<{ id: string; error: string }> = [];
    const disabledIds: string[] = [];
    let totalHits = 0;

    const query = {
      bool: {
        must: [{ term: { enabled: true } }, ...(spaceId ? [{ term: { spaceId } }] : [])],
        must_not: [{ exists: { field: 'deleted_at' } }],
      },
    };
    const sort = [{ updated_at: { order: 'desc' as const } }, '_shard_doc'];

    let searchAfter: estypes.SortResults | undefined;
    let hasMore = true;
    let pageCount = 0;

    while (hasMore && pageCount < MAX_PAGES) {
      pageCount++;

      const searchResponse = await client.search({
        query,
        size: pageSize,
        sort,
        _source: true,
        track_total_hits: pageCount === 1,
        ...(searchAfter ? { search_after: searchAfter } : {}),
      });

      const hits = searchResponse.hits.hits.filter(
        (hit): hit is typeof hit & { _id: string; _source: WorkflowProperties } =>
          hit._id != null && hit._source != null
      );

      if (hits.length === 0) {
        break;
      }

      totalHits += hits.length;

      const bulkOperations = hits.map((hit) => {
        const source = hit._source;
        const updatedYaml = updateWorkflowYamlFields(source.yaml, { enabled: false }, false);
        return {
          index: {
            _id: hit._id,
            document: {
              ...source,
              enabled: false,
              yaml: updatedYaml,
            },
          },
        };
      });

      try {
        const bulkResponse = await client.bulk({
          operations: bulkOperations,
          refresh: true,
        });

        const pageDisabledIds: string[] = [];
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
          } else if (operation?._id) {
            pageDisabledIds.push(operation._id);
          }
        });

        if (pageDisabledIds.length > 0) {
          disabledIds.push(...pageDisabledIds);
          await this.unscheduleDeletedWorkflowTasks(pageDisabledIds);
        }
      } catch (error) {
        bulkOperations.forEach((op) => {
          failures.push({
            id: op.index._id ?? 'unknown',
            error: error instanceof Error ? error.message : String(error),
          });
        });
      }

      hasMore = hits.length >= pageSize;
      if (hasMore) {
        const lastHit = hits[hits.length - 1];
        if (!lastHit.sort) {
          break;
        }
        searchAfter = lastHit.sort;
      }
    }

    if (hasMore && pageCount >= MAX_PAGES) {
      this.logger.warn(
        `disableAllWorkflows truncated at ${MAX_PAGES} pages (${totalHits} workflows processed)${
          spaceId ? ` (spaceId=${spaceId})` : ''
        }`
      );
    }

    this.logger.info(
      `Disabled ${disabledIds.length} workflows${
        spaceId ? ` in space ${spaceId}` : ' across all spaces'
      } (${failures.length} failures)`
    );

    return {
      total: totalHits,
      disabled: disabledIds.length,
      failures,
    };
  }

  /**
   * Returns all enabled, non-deleted workflows in the space that are subscribed to the given trigger type.
   * Used by the event-driven handler to resolve which workflows to run when an event is emitted.
   */
  public async getWorkflowsSubscribedToTrigger(
    triggerId: string,
    spaceId: string
  ): Promise<WorkflowDetailDto[]> {
    if (!this.workflowStorage) {
      throw new Error('WorkflowsService not initialized');
    }

    const pageSize = 1000;
    // theoretical MAX number of workflows we can process by minute.
    const MAX_PAGES = 50;
    const keepAlive = '1m';
    const indexPattern = `${workflowIndexName}-*`;
    const sort: estypes.Sort = [{ updated_at: { order: 'desc' } }, '_shard_doc'];
    const query = {
      bool: {
        must: [
          { term: { spaceId } },
          { term: { enabled: true } },
          { term: { triggerTypes: triggerId } },
        ],
        must_not: [{ exists: { field: 'deleted_at' } }],
      },
    };
    const _source = [
      'name',
      'description',
      'enabled',
      'yaml',
      'definition',
      'createdBy',
      'lastUpdatedBy',
      'valid',
      'created_at',
      'updated_at',
    ];

    const pitResponse = await this.esClient.openPointInTime({
      index: indexPattern,
      keep_alive: keepAlive,
      ignore_unavailable: true,
    });
    const pitId = pitResponse.id;

    try {
      const allHits: Array<{ _id: string; _source: WorkflowProperties }> = [];
      let searchAfter: estypes.SearchHit['sort'] | undefined;
      let hasMore = true;
      let pageCount = 0;

      while (hasMore && pageCount < MAX_PAGES) {
        pageCount++;
        const searchResponse = await this.esClient.search<WorkflowProperties>({
          pit: { id: pitId, keep_alive: keepAlive },
          size: pageSize,
          _source,
          query,
          sort,
          ...(searchAfter ? { search_after: searchAfter } : {}),
        });

        const hits = searchResponse.hits.hits;
        for (const hit of hits) {
          if (hit._source && hit._id) {
            allHits.push({ _id: hit._id, _source: hit._source as WorkflowProperties });
          }
        }

        hasMore = hits.length >= pageSize;
        if (hasMore) {
          const lastHit = hits[hits.length - 1];
          if (!lastHit.sort) {
            throw new Error(
              `Missing sort value on last hit (required for search_after). Last hit: ${JSON.stringify(
                lastHit
              )}`
            );
          }
          searchAfter = lastHit.sort;
        }
      }

      if (hasMore && pageCount >= MAX_PAGES) {
        this.logger.warn(
          `getWorkflowsSubscribedToTrigger truncated at ${MAX_PAGES} pages (${
            pageCount * pageSize
          } workflows) for trigger ${triggerId} in space ${spaceId}`
        );
      }

      return allHits.map(({ _id, _source: source }) =>
        this.transformStorageDocumentToWorkflowDto(_id, source)
      );
    } finally {
      try {
        await this.esClient.closePointInTime({ id: pitId });
      } catch (closeErr) {
        this.logger.warn(`Failed to close PIT ${pitId}: ${closeErr}`);
      }
    }
  }

  public async getWorkflows(
    params: GetWorkflowsParams,
    spaceId: string,
    options?: { includeExecutionHistory?: boolean }
  ): Promise<WorkflowListDto> {
    await this.ensureInitialized();

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
      .map<WorkflowListItemDto>((hit) => {
        if (!hit._source) {
          throw new Error('Missing _source in search result');
        }
        const workflow = this.transformStorageDocumentToWorkflowDto(hit._id, hit._source);
        return {
          ...workflow,
          description: workflow.description || '',
          definition: workflow.definition,
        };
      })
      .filter((workflow): workflow is NonNullable<typeof workflow> => workflow !== null);

    if (options?.includeExecutionHistory && workflows.length > 0) {
      const workflowIds = workflows.map((w) => w.id);
      const executionHistory = await this.getRecentExecutionsForWorkflows(workflowIds, spaceId);
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

  public async getWorkflowStats(
    spaceId: string,
    options?: { includeExecutionStats?: boolean }
  ): Promise<WorkflowStatsDto> {
    await this.ensureInitialized();

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
    const workflowsStats: WorkflowStatsDto = {
      workflows: {
        enabled: aggs?.enabled_count.doc_count ?? 0,
        disabled: aggs?.disabled_count.doc_count ?? 0,
      },
    };

    if (options?.includeExecutionStats) {
      // Get execution history stats for the last 30 days
      workflowsStats.executions = await this.getExecutionHistoryStats(spaceId);
    }

    return workflowsStats;
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
    await this.ensureInitialized();

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
    spaceId: string,
    options?: { includeInput?: boolean; includeOutput?: boolean }
  ): Promise<WorkflowExecutionDto | null> {
    return getWorkflowExecution({
      esClient: this.esClient,
      logger: this.logger,
      workflowExecutionIndex: WORKFLOWS_EXECUTIONS_INDEX,
      stepsExecutionIndex: WORKFLOWS_STEP_EXECUTIONS_INDEX,
      workflowExecutionId: executionId,
      spaceId,
      includeInput: options?.includeInput,
      includeOutput: options?.includeOutput,
    });
  }

  public async getChildWorkflowExecutions(
    parentExecutionId: string,
    spaceId: string
  ): Promise<ChildWorkflowExecutionItem[]> {
    return getChildWorkflowExecutions({
      esClient: this.esClient,
      workflowExecutionIndex: WORKFLOWS_EXECUTIONS_INDEX,
      stepsExecutionIndex: WORKFLOWS_STEP_EXECUTIONS_INDEX,
      parentExecutionId,
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

    if (params.omitStepRuns) {
      must.push({
        bool: {
          must_not: { exists: { field: 'stepId' } },
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
    const searchResult = await searchStepExecutions({
      esClient: this.esClient,
      logger: this.logger,
      stepsExecutionIndex: WORKFLOWS_STEP_EXECUTIONS_INDEX,
      workflowExecutionId: params.executionId,
      additionalQuery: { term: { id: params.id } },
      spaceId,
    });
    return searchResult.results;
  }

  public async searchStepExecutions(
    params: SearchStepExecutionsParams,
    spaceId: string
  ): Promise<StepExecutionListResult> {
    const sourceExcludes: string[] = [];
    if (!params.includeInput) sourceExcludes.push('input');
    if (!params.includeOutput) sourceExcludes.push('output');

    return searchStepExecutions({
      esClient: this.esClient,
      logger: this.logger,
      stepsExecutionIndex: WORKFLOWS_STEP_EXECUTIONS_INDEX,
      workflowId: params.workflowId,
      stepId: params.stepId,
      spaceId,
      sourceExcludes: sourceExcludes.length > 0 ? sourceExcludes : undefined,
      page: params.page,
      size: params.size,
    });
  }

  public async getExecutionLogs(params: ExecutionLogsParams): Promise<LogSearchResult> {
    await this.ensureInitialized();
    return this.workflowsExecutionEngine.workflowEventLoggerService.getExecutionLogs(params);
  }

  public async getStepLogs(params: StepLogsParams): Promise<LogSearchResult> {
    await this.ensureInitialized();
    return this.workflowsExecutionEngine.workflowEventLoggerService.getStepLogs(params);
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
  }

  public async getAvailableConnectors(
    spaceId: string,
    request: KibanaRequest
  ): Promise<GetAvailableConnectorsResponse> {
    await this.ensureInitialized();
    const actionsClient = this.actions.getUnsecuredActionsClient();
    const actionsClientWithRequest = await this.actions.getActionsClientWithRequest(request);

    // Get both connectors and action types
    const [connectors, actionTypes] = await Promise.all([
      actionsClient.getAll(spaceId),
      actionsClientWithRequest.listTypes({
        featureId: WorkflowsConnectorFeatureId,
        includeSystemActionTypes: false,
      }),
    ]);

    // Initialize connectorTypes with ALL available action types
    const connectorTypes: Record<string, ConnectorTypeInfo> = {};

    // First, add all action types (even those without instances), excluding filtered types
    actionTypes.forEach((actionType) => {
      // Get sub-actions from our static mapping
      const subActions = CONNECTOR_SUB_ACTIONS_MAP[actionType.id];

      connectorTypes[actionType.id] = {
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
      if (connectorTypes[connector.actionTypeId]) {
        connectorTypes[connector.actionTypeId].instances.push({
          id: connector.id,
          name: connector.name,
          isPreconfigured: connector.isPreconfigured,
          isDeprecated: connector.isDeprecated,
          ...this.getConnectorInstanceConfig(connector),
        });
      }
    });

    return { connectorTypes, totalConnectors: connectors.length };
  }

  private getConnectorInstanceConfig(
    connector: FindActionResult
  ): { config: ConnectorInstanceConfig } | undefined {
    if (connector.actionTypeId === '.inference') {
      return { config: { taskType: connector.config?.taskType } };
    }
    return undefined;
  }

  public async validateWorkflow(
    yaml: string,
    spaceId: string,
    request: KibanaRequest
  ): Promise<ValidateWorkflowResponseDto> {
    const zodSchema = await this.getWorkflowZodSchema({ loose: false }, spaceId, request);
    const triggerDefinitions = this.workflowsExtensions?.getAllTriggerDefinitions() ?? [];
    return validateWorkflowYaml(yaml, zodSchema, { triggerDefinitions });
  }

  public async getWorkflowZodSchema(
    options: {
      loose?: false;
    },
    spaceId: string,
    request: KibanaRequest
  ): Promise<z.ZodType> {
    const { connectorTypes } = await this.getAvailableConnectors(spaceId, request);
    const registeredTriggerIds =
      this.workflowsExtensions?.getAllTriggerDefinitions().map((t) => t.id) ?? [];
    return getWorkflowZodSchema(connectorTypes, registeredTriggerIds);
  }
}
