/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
  WorkflowExecutionDto,
  WorkflowExecutionHistoryModel,
  WorkflowExecutionListDto,
  WorkflowListDto,
  WorkflowStatsDto,
} from '@kbn/workflows';
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
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import type { z } from '@kbn/zod/v4';

import type { StepExecutionListResult } from './lib/search_step_executions';

import type {
  DeleteWorkflowsResponse,
  GetStepExecutionParams,
  GetWorkflowsParams,
  SearchStepExecutionsParams,
} from './workflows_management_api';

import type { BulkFailureEntry } from '../lib/bulk_id_helpers';
import { WorkflowCrudService } from '../services/workflow_crud_service';
import { WorkflowExecutionQueryService } from '../services/workflow_execution_query_service';
import { WorkflowSearchService } from '../services/workflow_search_service';
import { WorkflowValidationService } from '../services/workflow_validation_service';
import type { WorkflowStorage } from '../storage/workflow_storage';
import { createStorage } from '../storage/workflow_storage';
import { WorkflowTaskScheduler } from '../tasks/workflow_task_scheduler';
import type { WorkflowsServerPluginStartDeps } from '../types';

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
  private workflowsExtensions!: WorkflowsExtensionsServerPluginStart;
  private workflowStorage!: WorkflowStorage;
  private taskScheduler!: WorkflowTaskScheduler;
  private esClient!: ElasticsearchClient;
  private validationService!: WorkflowValidationService;
  private executionQueryService!: WorkflowExecutionQueryService;
  private searchService!: WorkflowSearchService;
  private crudService!: WorkflowCrudService;
  private getActionsClient!: () => Promise<IUnsecuredActionsClient>;
  private getActionsClientWithRequest!: (
    request: KibanaRequest
  ) => Promise<PublicMethodsOf<ActionsClient>>;

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

    this.crudService = new WorkflowCrudService({
      logger: this.logger,
      esClient: this.esClient,
      workflowStorage: this.workflowStorage,
      getSecurity: () => this.coreStart.security,
      workflowsExtensions: this.workflowsExtensions,
      getTaskScheduler: () => this.taskScheduler,
      executionQueryService: this.executionQueryService,
      validationService: this.validationService,
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
    await this.ensureInitialized();
    return this.crudService.getWorkflowsSourceByIds(ids, spaceId, source, options);
  }

  public async createWorkflow(
    workflow: CreateWorkflowCommand,
    spaceId: string,
    request: KibanaRequest
  ): Promise<WorkflowDetailDto> {
    await this.ensureInitialized();
    return this.crudService.createWorkflow(workflow, spaceId, request);
  }

  public async bulkCreateWorkflows(
    workflows: CreateWorkflowCommand[],
    spaceId: string,
    request: KibanaRequest,
    options?: { overwrite?: boolean }
  ): Promise<{ created: WorkflowDetailDto[]; failed: BulkFailureEntry[] }> {
    await this.ensureInitialized();
    return this.crudService.bulkCreateWorkflows(workflows, spaceId, request, options);
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
    options?: { includeExecutionHistory?: boolean }
  ): Promise<WorkflowListDto> {
    await this.ensureInitialized();
    return this.searchService.getWorkflows(params, spaceId, options);
  }

  public async getWorkflowStats(
    spaceId: string,
    options?: { includeExecutionStats?: boolean }
  ): Promise<WorkflowStatsDto> {
    await this.ensureInitialized();
    return this.searchService.getWorkflowStats(spaceId, options);
  }

  public async getWorkflowAggs(fields: string[], spaceId: string): Promise<WorkflowAggsDto> {
    await this.ensureInitialized();
    return this.searchService.getWorkflowAggs(fields, spaceId);
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
    await this.ensureInitialized();
    return this.executionQueryService.getStepExecution(params, spaceId);
  }

  public async getAvailableConnectors(
    spaceId: string,
    request: KibanaRequest
  ): Promise<GetAvailableConnectorsResponse> {
    await this.ensureInitialized();
    return this.validationService.getAvailableConnectors(spaceId, request);
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
}
