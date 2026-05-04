/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core/server';
import { isNotFoundError } from '@kbn/es-errors';
import type {
  CreateWorkflowCommand,
  EsWorkflow,
  UpdatedWorkflowResponseDto,
  WorkflowDetailDto,
} from '@kbn/workflows';
import type { WorkflowPartialDetailDto } from '@kbn/workflows/types/v1';

import { WorkflowConflictError } from '@kbn/workflows-yaml';
import type { WorkflowCrudDeps } from './types';
import { extractBulkItemError } from '../api/lib/bulk_response_helpers';
import { deleteWorkflows } from '../api/lib/workflow_deletion';
import { disableAllWorkflows } from '../api/lib/workflow_disable_all';
import {
  transformStorageDocumentToWorkflowDto,
  transformStoragePartialToWorkflowDto,
} from '../api/lib/workflow_dto_transform';
import {
  applyFieldUpdates,
  applyYamlUpdate,
  getTriggerTypesFromDefinition,
  prepareWorkflowDocument,
  workflowYamlDeclaresTopLevelEnabled,
} from '../api/lib/workflow_prepare';
import { workflowSpaceFilter } from '../api/lib/workflow_query_filters';
import type { DeleteWorkflowsResponse } from '../api/workflows_management_api';
import type { BulkFailureEntry, BulkWorkflowEntry } from '../lib/bulk_id_helpers';
import {
  deduplicateUserIds,
  partitionByIdSource,
  removeConflictingIds,
} from '../lib/bulk_id_helpers';
import { getAuthenticatedUser } from '../lib/get_user';
import { resolveUniqueWorkflowIds, validateWorkflowId } from '../lib/workflow_id_resolver';
import type { WorkflowProperties } from '../storage/workflow_storage';
import { scheduleWorkflowTriggers } from '../task_defs/schedule_workflow_triggers';
import { syncSchedulerAfterSave } from '../task_defs/sync_scheduler_after_save';

export class WorkflowCrudService {
  constructor(private readonly deps: WorkflowCrudDeps) {}

  async getWorkflow(
    id: string,
    spaceId: string,
    options?: { includeDeleted?: boolean }
  ): Promise<WorkflowDetailDto | null> {
    try {
      const { must, must_not } = workflowSpaceFilter(spaceId, {
        includeDeleted: options?.includeDeleted ?? false,
      });
      must.push({ ids: { values: [id] } });
      const response = await this.deps.workflowStorage.getClient().search({
        query: { bool: { must, must_not } },
        size: 1,
        track_total_hits: false,
      });

      if (response.hits.hits.length === 0) {
        return null;
      }

      const document = response.hits.hits[0];
      return transformStorageDocumentToWorkflowDto(document._id, document._source);
    } catch (error) {
      if (isNotFoundError(error)) {
        return null;
      }
      throw error;
    }
  }

  async getWorkflowsByIds(
    ids: string[],
    spaceId: string,
    options?: { includeDeleted?: boolean }
  ): Promise<WorkflowDetailDto[]> {
    if (ids.length === 0) {
      return [];
    }

    const { must, must_not } = workflowSpaceFilter(spaceId, {
      includeDeleted: options?.includeDeleted ?? false,
    });
    must.push({ ids: { values: ids } });

    const response = await this.deps.workflowStorage.getClient().search({
      query: { bool: { must, must_not } },
      size: ids.length,
      track_total_hits: false,
    });

    return response.hits.hits.map((hit) =>
      transformStorageDocumentToWorkflowDto(hit._id, hit._source)
    );
  }

  async getWorkflowsSourceByIds(
    ids: string[],
    spaceId: string,
    source?: string[],
    options?: { includeDeleted?: boolean }
  ): Promise<WorkflowPartialDetailDto[]> {
    if (ids.length === 0) {
      return [];
    }

    const { must, must_not } = workflowSpaceFilter(spaceId, {
      includeDeleted: options?.includeDeleted ?? false,
    });
    must.push({ ids: { values: ids } });

    const response = await this.deps.workflowStorage.getClient().search({
      query: { bool: { must, must_not } },
      _source: source ?? true,
      size: ids.length,
      track_total_hits: false,
    });

    return response.hits.hits.map((hit) =>
      transformStoragePartialToWorkflowDto(hit._id, hit._source)
    );
  }

  async createWorkflow(
    workflow: CreateWorkflowCommand,
    spaceId: string,
    request: KibanaRequest
  ): Promise<WorkflowDetailDto> {
    if (workflow.id) {
      validateWorkflowId(workflow.id);
    }

    const zodSchema = await this.deps.validationService.getWorkflowZodSchema(
      { loose: false },
      spaceId,
      request
    );
    const authenticatedUser = getAuthenticatedUser(request, this.deps.getSecurity());
    const now = new Date();
    const triggerDefinitions = this.deps.workflowsExtensions?.getAllTriggerDefinitions() ?? [];

    const {
      id: baseId,
      workflowData,
      definition,
    } = prepareWorkflowDocument({
      workflow,
      zodSchema,
      authenticatedUser,
      now,
      spaceId,
      triggerDefinitions,
    });

    let id = baseId;
    if (workflow.id) {
      const existingWorkflow = await this.getWorkflow(workflow.id, spaceId, {
        includeDeleted: true,
      });
      if (existingWorkflow) {
        throw new WorkflowConflictError(
          `Workflow with id '${workflow.id}' already exists`,
          workflow.id
        );
      }
    } else {
      [id] = await resolveUniqueWorkflowIds([baseId], new Set(), (candidateIds) =>
        this.checkExistingIds(candidateIds, spaceId)
      );
    }

    await this.deps.workflowStorage.getClient().index({
      id,
      document: workflowData,
      refresh: true,
    });

    await scheduleWorkflowTriggers({
      workflowId: id,
      definition,
      spaceId,
      request,
      taskScheduler: this.deps.getTaskScheduler(),
      logger: this.deps.logger,
    });

    return transformStorageDocumentToWorkflowDto(id, workflowData);
  }

  async bulkCreateWorkflows(
    workflows: CreateWorkflowCommand[],
    spaceId: string,
    request: KibanaRequest,
    options?: { overwrite?: boolean }
  ): Promise<{ created: WorkflowDetailDto[]; failed: BulkFailureEntry[] }> {
    const zodSchema = await this.deps.validationService.getWorkflowZodSchema(
      { loose: false },
      spaceId,
      request
    );
    const authenticatedUser = getAuthenticatedUser(request, this.deps.getSecurity());
    const now = new Date();
    const triggerDefinitions = this.deps.workflowsExtensions?.getAllTriggerDefinitions() ?? [];

    const created: WorkflowDetailDto[] = [];
    const failed: BulkFailureEntry[] = [];
    const validWorkflows: BulkWorkflowEntry[] = [];

    for (let i = 0; i < workflows.length; i++) {
      try {
        const customId = workflows[i].id;
        if (customId) {
          validateWorkflowId(customId);
        }
        const prepared = prepareWorkflowDocument({
          workflow: workflows[i],
          zodSchema,
          authenticatedUser,
          now,
          spaceId,
          triggerDefinitions,
        });

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

    const overwrite = options?.overwrite ?? false;
    const { resolvedWorkflows, failures } = await this.resolveAndDeduplicateBulkIds(
      validWorkflows,
      overwrite,
      spaceId
    );
    failed.push(...failures);

    const bulkOperations = resolvedWorkflows.map((vw) =>
      overwrite
        ? { index: { _id: vw.id, document: vw.workflowData } }
        : { create: { _id: vw.id, document: vw.workflowData } }
    );

    if (bulkOperations.length > 0) {
      const bulkResponse = await this.deps.workflowStorage.getClient().bulk({
        operations: bulkOperations,
        refresh: 'wait_for',
      });

      for (let itemIndex = 0; itemIndex < bulkResponse.items.length; itemIndex++) {
        const item = bulkResponse.items[itemIndex];
        const operation = item.index ?? item.create;
        const resolvedWorkflow = resolvedWorkflows[itemIndex];

        if (operation?.error) {
          failed.push({
            index: resolvedWorkflow.idx,
            id: resolvedWorkflow.id,
            error: extractBulkItemError(operation.error),
          });
        } else {
          created.push(
            transformStorageDocumentToWorkflowDto(
              resolvedWorkflow.id,
              resolvedWorkflow.workflowData
            )
          );
        }
      }
    }

    const createdIds = new Set(created.map((w) => w.id));
    const successfullyWritten = resolvedWorkflows.filter((vw) => createdIds.has(vw.id));
    const taskScheduler = this.deps.getTaskScheduler();

    if (overwrite && taskScheduler) {
      // Overwrite may have removed the scheduled trigger or disabled the workflow — sync to drop orphaned tasks.
      await Promise.allSettled(
        successfullyWritten.map((vw) =>
          syncSchedulerAfterSave({
            workflowId: vw.id,
            spaceId,
            request,
            getWorkflow: (wfId, sp) => this.getEsWorkflowForScheduler(wfId, sp),
            taskScheduler,
            logger: this.deps.logger,
          })
        )
      );
    } else {
      const workflowsToSchedule = successfullyWritten.filter((vw) =>
        vw.definition?.triggers?.some((t) => t.type === 'scheduled')
      );
      await Promise.allSettled(
        workflowsToSchedule.map((vw) =>
          scheduleWorkflowTriggers({
            workflowId: vw.id,
            definition: vw.definition,
            spaceId,
            request,
            taskScheduler,
            logger: this.deps.logger,
          })
        )
      );
    }

    return { created, failed };
  }

  async updateWorkflow(
    id: string,
    workflow: Partial<EsWorkflow>,
    spaceId: string,
    request: KibanaRequest
  ): Promise<UpdatedWorkflowResponseDto> {
    try {
      const { source: existingSource } = await this.getExistingWorkflowDocument(id, spaceId);
      const authenticatedUser = getAuthenticatedUser(request, this.deps.getSecurity());
      const now = new Date();
      const validationErrors: string[] = [];
      let updatedData: Partial<WorkflowProperties> = {
        lastUpdatedBy: authenticatedUser,
        updated_at: now.toISOString(),
      };

      let shouldUpdateScheduler =
        workflow.enabled !== undefined && workflow.enabled !== existingSource.enabled;

      if (workflow.yaml) {
        const zodSchema = await this.deps.validationService.getWorkflowZodSchema(
          { loose: false },
          spaceId,
          request
        );
        const triggerDefinitions = this.deps.workflowsExtensions?.getAllTriggerDefinitions() ?? [];
        const yamlResult = applyYamlUpdate({
          workflowYaml: workflow.yaml,
          zodSchema,
          triggerDefinitions,
        });
        updatedData = { ...updatedData, yaml: workflow.yaml, ...yamlResult.updatedDataPatch };
        validationErrors.push(...yamlResult.validationErrors);
        shouldUpdateScheduler = shouldUpdateScheduler || yamlResult.shouldUpdateScheduler;

        if (
          yamlResult.validationErrors.length === 0 &&
          yamlResult.updatedDataPatch.valid &&
          updatedData.definition &&
          !workflowYamlDeclaresTopLevelEnabled(workflow.yaml)
        ) {
          const resolvedEnabled =
            workflow.enabled !== undefined ? workflow.enabled : existingSource.enabled;
          updatedData.enabled = resolvedEnabled;
          const currentDefinition = updatedData.definition;
          if (currentDefinition) {
            updatedData.definition = { ...currentDefinition, enabled: resolvedEnabled };
          }
        }
      } else {
        const fieldResult = applyFieldUpdates(workflow, existingSource);
        updatedData = { ...updatedData, ...fieldResult.patch };
        validationErrors.push(...fieldResult.validationErrors);
      }

      const finalData: WorkflowProperties = { ...existingSource, ...updatedData };
      if (finalData.triggerTypes === undefined) {
        finalData.triggerTypes = getTriggerTypesFromDefinition(finalData.definition) ?? [];
      }

      await this.deps.workflowStorage.getClient().index({
        id,
        document: finalData,
        refresh: true,
      });

      const taskScheduler = this.deps.getTaskScheduler();
      if (shouldUpdateScheduler && taskScheduler) {
        await syncSchedulerAfterSave({
          workflowId: id,
          spaceId,
          request,
          getWorkflow: (wfId, sp) => this.getEsWorkflowForScheduler(wfId, sp),
          taskScheduler,
          logger: this.deps.logger,
        });
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
      if (isNotFoundError(error)) {
        throw new Error(`Workflow with id ${id} not found`);
      }
      throw error;
    }
  }

  async deleteWorkflows(
    ids: string[],
    spaceId: string,
    options?: { force?: boolean }
  ): Promise<DeleteWorkflowsResponse> {
    return deleteWorkflows({
      ids,
      spaceId,
      force: options?.force ?? false,
      storage: this.deps.workflowStorage,
      esClient: this.deps.esClient,
      taskScheduler: this.deps.getTaskScheduler(),
      logger: this.deps.logger,
      getWorkflowExecutions: (params, sp) =>
        this.deps.executionQueryService.getWorkflowExecutions(params, sp),
    });
  }

  async disableAllWorkflows(spaceId?: string): Promise<{
    total: number;
    disabled: number;
    failures: Array<{ id: string; error: string }>;
  }> {
    return disableAllWorkflows({
      storage: this.deps.workflowStorage,
      taskScheduler: this.deps.getTaskScheduler(),
      logger: this.deps.logger,
      spaceId,
    });
  }

  private async getEsWorkflowForScheduler(id: string, spaceId: string): Promise<EsWorkflow | null> {
    const { must } = workflowSpaceFilter(spaceId, { includeDeleted: true });
    must.push({ ids: { values: [id] } });
    const response = await this.deps.workflowStorage.getClient().search({
      query: { bool: { must } },
      size: 1,
      track_total_hits: false,
    });
    const hit = response.hits.hits[0];
    if (!hit?._id || !hit._source) {
      return null;
    }
    const source = hit._source;
    return {
      id: hit._id,
      name: source.name,
      description: source.description,
      enabled: source.enabled,
      tags: source.tags,
      yaml: source.yaml,
      definition: source.definition ?? undefined,
      createdBy: source.createdBy,
      lastUpdatedBy: source.lastUpdatedBy,
      valid: source.valid,
      deleted_at: source.deleted_at,
      createdAt: new Date(source.created_at),
      lastUpdatedAt: new Date(source.updated_at),
    };
  }

  private async getExistingWorkflowDocument(
    id: string,
    spaceId: string
  ): Promise<{ source: WorkflowProperties }> {
    const { must } = workflowSpaceFilter(spaceId, { includeDeleted: true });
    must.push({ ids: { values: [id] } });
    const searchResponse = await this.deps.workflowStorage.getClient().search({
      query: { bool: { must } },
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

  private async resolveAndDeduplicateBulkIds(
    validWorkflows: readonly BulkWorkflowEntry[],
    overwrite: boolean,
    spaceId: string
  ): Promise<{ resolvedWorkflows: BulkWorkflowEntry[]; failures: BulkFailureEntry[] }> {
    const failures: BulkFailureEntry[] = [];

    const { serverGenerated, userSupplied } = partitionByIdSource(validWorkflows);
    const seenIds = new Set<string>(userSupplied.map((wf) => wf.id));

    let resolvedServerGen = serverGenerated;
    if (serverGenerated.length > 0) {
      const resolvedIds = await resolveUniqueWorkflowIds(
        serverGenerated.map((wf) => wf.id),
        seenIds,
        (candidateIds) => this.checkExistingIds(candidateIds, spaceId)
      );
      resolvedServerGen = serverGenerated.map((wf, i) => ({ ...wf, id: resolvedIds[i] }));
    }

    const resolvedById = new Map(resolvedServerGen.map((wf, i) => [serverGenerated[i], wf]));
    let workflows: BulkWorkflowEntry[] = validWorkflows.map((wf) => resolvedById.get(wf) ?? wf);

    if (!overwrite && userSupplied.length > 0) {
      const existingUserIds = await this.checkExistingIds(
        userSupplied.map((wf) => wf.id),
        spaceId
      );
      const conflictResult = removeConflictingIds(workflows, existingUserIds);
      workflows = conflictResult.kept;
      failures.push(...conflictResult.removed);
    }

    const dedupResult = deduplicateUserIds(workflows);
    workflows = dedupResult.kept;
    failures.push(...dedupResult.removed);

    return { resolvedWorkflows: workflows, failures };
  }

  private async checkExistingIds(ids: string[], spaceId: string): Promise<Set<string>> {
    if (ids.length === 0) {
      return new Set();
    }

    const { must } = workflowSpaceFilter(spaceId, { includeDeleted: true });
    must.push({ ids: { values: ids } });

    const response = await this.deps.workflowStorage.getClient().search({
      query: { bool: { must } },
      size: ids.length,
      track_total_hits: false,
    });

    return new Set(response.hits.hits.map((hit) => hit._id).filter((id): id is string => !!id));
  }
}
