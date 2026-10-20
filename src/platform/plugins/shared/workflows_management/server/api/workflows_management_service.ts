/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ActionsClient, IUnsecuredActionsClient } from '@kbn/actions-plugin/server';
import type {
  CoreSetup,
  CoreStart,
  ElasticsearchClient,
  KibanaRequest,
  Logger,
} from '@kbn/core/server';
import { SPACES_EXTENSION_ID } from '@kbn/core/server';
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
  ManagedWorkflowInstanceState,
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
  WorkflowExecutionsDataClient,
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

import type { GetExecutionStepExecutionsResult } from './lib/get_execution_step_executions';
import type { StepExecutionListResult } from './lib/search_step_executions';

import { grantPageRunApiKey } from './pages/page_run_identity';
import { WORKFLOW_PAGE_SAVED_OBJECT_TYPE } from './pages/page_saved_object';
import { WorkflowPageStore } from './pages/page_store';
import { WorkflowManagementAuditLog } from './routes/utils/workflow_audit_logging';
import type {
  DeleteWorkflowsResponse,
  GetExecutionStepExecutionsParams,
  GetStepExecutionParams,
  GetWorkflowAggsOptions,
  GetWorkflowsParams,
  SearchStepExecutionsParams,
} from './workflows_management_api';

import type {
  RestoreWorkflowVersionResponseDto,
  WorkflowChangesHistoryResponse,
} from '../../common/lib/workflow_change_history/types';
import { getAuthenticatedUser } from '../lib/get_user';
import { getHistoryForWorkflow } from '../lib/get_workflow_change_history';
import {
  type ManagedInstallReadinessResult,
  waitForManagedWorkflowInstallReadiness,
} from '../lib/wait_for_managed_workflow_install_readiness';
import { ManagedWorkflowsService } from '../services/managed_workflows_service';
import { WorkflowAccessControlService } from '../services/workflow_access_control';
import { WorkflowChangeHistoryService } from '../services/workflow_change_history_service';
import {
  type BulkCreateWorkflowsResult,
  WorkflowCrudService,
} from '../services/workflow_crud_service';
import type {
  ProcessedWaitForInputFacets,
  ProcessedWaitForInputFilters,
  WaitForInputListResult,
} from '../services/workflow_execution_query_service';
import { WorkflowExecutionQueryService } from '../services/workflow_execution_query_service';
import { WorkflowSearchService } from '../services/workflow_search_service';
import { WorkflowValidationService } from '../services/workflow_validation_service';
import {
  createStorage,
  type WorkflowProperties,
  type WorkflowStorage,
} from '../storage/workflow_storage';
import { WorkflowTaskScheduler } from '../tasks/workflow_task_scheduler';
import type { WorkflowsServerPluginSetupDeps, WorkflowsServerPluginStartDeps } from '../types';

export interface SearchExecutionsViewParams {
  request?: KibanaRequest;
  accessControlFilter?: estypes.QueryDslQueryContainer;
  query?: estypes.QueryDslQueryContainer;
  statuses?: ExecutionStatus[];
  executionTypes?: ExecutionType[];
  executedBy?: string[];
  concurrencyGroupKey?: string;
  startedAfter?: string;
  startedBefore?: string;
  finishedAfter?: string;
  finishedBefore?: string;
  collapse?: WorkflowExecutionCollapseField;
  sortField?: string;
  sortOrder?: WorkflowExecutionSortOrder;
  page?: number;
  size?: number;
  trackTotalHits?: boolean;
  includeManagedExecutions?: boolean;
}

export interface SearchWorkflowExecutionsParams {
  request?: KibanaRequest;
  accessControlFilter?: estypes.QueryDslQueryContainer;
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
  /** Opaque `search_after` sort values from a prior page. */
  searchAfter?: estypes.FieldValue[];
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
  private workflowExecutionsDataClient!: WorkflowExecutionsDataClient;
  private validationService!: WorkflowValidationService;
  private executionQueryService!: WorkflowExecutionQueryService;
  private searchService!: WorkflowSearchService;
  private crudService!: WorkflowCrudService;
  private pageStore: WorkflowPageStore | null = null;
  private accessControlService?: WorkflowAccessControlService;
  private managedWorkflowsService!: ManagedWorkflowsService;
  private readonly changeHistoryService: WorkflowChangeHistoryService;
  private getActionsClient!: () => Promise<IUnsecuredActionsClient>;
  private getActionsClientWithRequest!: (
    request: KibanaRequest
  ) => Promise<PublicMethodsOf<ActionsClient>>;

  private readonly initPromise: Promise<void>;
  /** One-shot stop signal; replaced on start so abort can fire again next lifecycle. */
  private stopController = new AbortController();

  constructor(
    public readonly core: CoreSetup<WorkflowsServerPluginStartDeps>,
    public readonly plugins: WorkflowsServerPluginSetupDeps,
    private readonly logger: Logger,
    public readonly kibanaVersion: string
  ) {
    this.changeHistoryService = new WorkflowChangeHistoryService(logger, kibanaVersion);
    this.initPromise = this.initialize(core);
  }

  public setStopping(stopping: boolean): void {
    if (stopping) {
      this.stopController.abort();
      return;
    }
    this.stopController = new AbortController();
  }

  private async ensureInitialized(): Promise<void> {
    await this.initPromise;
  }

  /**
   * Waits until Elasticsearch is available (and pingable) or Kibana is stopping.
   * Never throws for expected teardown / ES unavailability.
   */
  private async ensureManagedInstallReady(
    operation: string
  ): Promise<ManagedInstallReadinessResult> {
    const readiness = await waitForManagedWorkflowInstallReadiness({
      core$: this.core.status.core$,
      esClient: { ping: () => this.esClient.ping() },
      signal: this.stopController.signal,
      operation,
      logger: this.logger,
    });

    if (!readiness.ready) {
      this.logger.warn(`Workflows Management: skipping managed ${operation} (${readiness.reason})`);
    }

    return readiness;
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

  private async initialize(core: CoreSetup<WorkflowsServerPluginStartDeps>) {
    const [coreStart, pluginsStart] = await core.getStartServices();
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
      getCoreStart: () => this.coreStart,
    });

    const { workflowExecutionsDataClient, stepExecutionsDataClient } =
      this.workflowsExecutionEngine.__internalStorage;
    this.workflowExecutionsDataClient = workflowExecutionsDataClient;

    this.executionQueryService = new WorkflowExecutionQueryService({
      logger: this.logger,
      esClient: this.esClient,
      workflowExecutionsDataClient: this.workflowExecutionsDataClient,
      stepExecutionsDataClient,
      workflowEventLoggerService: this.workflowsExecutionEngine.workflowEventLoggerService,
    });

    this.searchService = new WorkflowSearchService({
      logger: this.logger,
      workflowStorage: this.workflowStorage,
      esClient: this.esClient,
      workflowExecutionsDataClient: this.workflowExecutionsDataClient,
    });

    await this.initializeChangeHistoryService(coreStart);

    this.crudService = new WorkflowCrudService({
      authz: this.pluginsStart.security?.authz,
      getSpaceId: (request) => this.plugins.spaces.spacesService.getSpaceId(request),
      getServiceAccountBindings: () => this.workflowsExecutionEngine.serviceAccountBindings,
      logger: this.logger,
      workflowStorage: this.workflowStorage,
      getSecurity: () => this.coreStart.security,
      workflowsExtensions: this.workflowsExtensions,
      getTaskScheduler: () => this.taskScheduler,
      executionQueryService: this.executionQueryService,
      validationService: this.validationService,
      getCoreStart: () => this.coreStart,
      changeHistoryService: this.changeHistoryService,
      workflowExecutionsDataClient: this.workflowExecutionsDataClient,
      stepExecutionsDataClient,
      retirePage: (ref) => this.retirePage(ref),
      setPageRunIdentity: (ref) => this.setPageRunIdentity(ref),
    });

    const { encryptedSavedObjects } = pluginsStart;
    if (encryptedSavedObjects) {
      this.pageStore = new WorkflowPageStore({
        // The internal repository skips extensions and would store the secret in plaintext.
        // Spaces is excluded because the store passes each page's namespace itself.
        client: coreStart.savedObjects.getUnsafeInternalClient({
          includedHiddenTypes: [WORKFLOW_PAGE_SAVED_OBJECT_TYPE],
          excludedExtensions: [SPACES_EXTENSION_ID],
        }),
        encryptedClient: encryptedSavedObjects.getClient({
          includedHiddenTypes: [WORKFLOW_PAGE_SAVED_OBJECT_TYPE],
        }),
        invalidateApiKey: async (apiKeyId) => {
          await coreStart.security.authc.apiKeys.invalidateAsInternalUser({ ids: [apiKeyId] });
        },
      });
    }

    this.managedWorkflowsService = new ManagedWorkflowsService({
      crudService: this.crudService,
      workflowsExecutionEngine: this.workflowsExecutionEngine,
      logger: this.logger,
      isStopping: () => this.stopController.signal.aborted,
      audit: new WorkflowManagementAuditLog({ service: this }),
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

  public async getAccessControl(): Promise<WorkflowAccessControlService> {
    await this.ensureInitialized();
    return (this.accessControlService ??= new WorkflowAccessControlService(
      this.coreStart,
      this.crudService,
      this.pluginsStart.security?.authz
    ));
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
        userProfileService: this.coreStart.userProfile,
        getWorkflowSource: (workflowId, sid) =>
          this.crudService.getWorkflowDocumentSource(workflowId, sid, {
            includeGlobal: true,
            includeDeleted: true,
          }),
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

  public async findExistingWorkflowIds(ids: string[]): Promise<string[]> {
    await this.ensureInitialized();
    return this.crudService.findExistingWorkflowIds(ids);
  }

  public async getWorkflowsSourceByIds(
    ids: string[],
    spaceId: string,
    source?: string[],
    options?: { includeDeleted?: boolean; accessControlFilter?: estypes.QueryDslQueryContainer }
  ): Promise<WorkflowPartialDetailDto[]> {
    await this.ensureInitialized();
    return this.crudService.getWorkflowsSourceByIds(ids, spaceId, source, options);
  }

  public async getInstalledManagedWorkflowState(
    id: string,
    spaceId: string,
    pluginId: string
  ): Promise<ManagedWorkflowInstanceState | null> {
    await this.ensureInitialized();
    const source = await this.crudService.getWorkflowDocumentSource(id, spaceId);
    if (!source?.managed || source.managedBy !== pluginId) {
      return null;
    }
    return this.toManagedWorkflowInstanceState(id, source);
  }

  public async listInstalledManagedWorkflowStates(
    pluginId: string
  ): Promise<ManagedWorkflowInstanceState[]> {
    await this.ensureInitialized();
    const documents = await this.crudService.getManagedWorkflowDocumentsAllSpaces({ pluginId });
    return documents.map(({ id, source }) => this.toManagedWorkflowInstanceState(id, source));
  }

  private toManagedWorkflowInstanceState(
    id: string,
    source: WorkflowProperties
  ): ManagedWorkflowInstanceState {
    return {
      workflowId: id,
      spaceId: source.spaceId,
      definitionId: source.originManagedWorkflowId ?? null,
      templateValues: source.managedTemplateValues ?? null,
      documentVersion: source.version ?? null,
    };
  }

  public async createWorkflow(
    workflow: CreateWorkflowCommand,
    spaceId: string,
    request: KibanaRequest,
    options?: { nameFallback?: string }
  ): Promise<WorkflowDetailDto> {
    await this.ensureInitialized();
    return this.crudService.createWorkflow(workflow, spaceId, request, options);
  }

  public async bulkCreateWorkflows(
    workflows: CreateWorkflowCommand[],
    spaceId: string,
    request: KibanaRequest,
    options?: { overwrite?: boolean }
  ): Promise<BulkCreateWorkflowsResult> {
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

  /** Loads the workflow behind a page. A page belongs to one space, so global workflows have none. */
  public async getPageWorkflow(
    workflowId: string,
    spaceId: string
  ): Promise<WorkflowDetailDto | null> {
    await this.ensureInitialized();
    return this.crudService.getWorkflow(workflowId, spaceId, { includeGlobal: false });
  }

  /** Returns the page URL secret, creating the page on first use. Callers authorize first. */
  public async getPageSecret(workflowId: string, spaceId: string): Promise<string> {
    return (await this.getPageStore()).getOrCreateSecret({ workflowId, spaceId });
  }

  /** Replaces the page URL secret. Callers authorize first. */
  public async rotatePage(workflowId: string, spaceId: string): Promise<string> {
    return (await this.getPageStore()).rotate({ workflowId, spaceId });
  }

  /** Checks a page URL secret. Used by the public page route, which has no Kibana identity. */
  public async verifyPageSecret(ref: {
    workflowId: string;
    spaceId: string;
    secret: string;
  }): Promise<boolean> {
    return (await this.getPageStore()).verify(ref);
  }

  /** Returns the encoded API key a page run launches with. The public route needs no identity. */
  public async getPageRunApiKey(ref: {
    workflowId: string;
    spaceId: string;
  }): Promise<string | undefined> {
    return (await this.getPageStore()).getRunApiKey(ref);
  }

  /** Returns the user whose key a page runs with. Callers authorize first. */
  public async getPageRunAsUsername(
    workflowId: string,
    spaceId: string
  ): Promise<string | undefined> {
    return (await this.getPageStore()).getRunAsUsername({ workflowId, spaceId });
  }

  private async getPageStore(): Promise<WorkflowPageStore> {
    await this.ensureInitialized();
    if (!this.pageStore) {
      throw new Error('Workflow pages need the encrypted saved objects plugin');
    }
    return this.pageStore;
  }

  /**
   * Makes a page run as the user who just saved its workflow. A failure leaves the
   * previous identity in place and never fails the save.
   */
  private async setPageRunIdentity({
    workflowId,
    spaceId,
    request,
  }: {
    workflowId: string;
    spaceId: string;
    request: KibanaRequest;
  }): Promise<void> {
    if (!this.pageStore) {
      return;
    }
    try {
      const identity = await grantPageRunApiKey({
        security: this.coreStart.security,
        request,
        workflowId,
      });
      if (!identity) {
        this.logger.warn(
          `No user to run the page of workflow ${workflowId} as; kept the previous identity`
        );
        return;
      }
      await this.pageStore.setRunIdentity(
        { workflowId, spaceId },
        {
          apiKey: identity.apiKey,
          apiKeyId: identity.apiKeyId,
          runAsUsername: identity.username,
        }
      );
    } catch (error) {
      this.logger.warn(
        `Failed to set the run identity of the page of workflow ${workflowId}: ${error}`
      );
    }
  }

  /** Deletes a page credential, so a re-added page trigger gets a new URL. */
  private async retirePage(ref: { workflowId: string; spaceId: string }): Promise<void> {
    try {
      await this.pageStore?.retire(ref);
    } catch (error) {
      this.logger.warn(`Failed to retire page of workflow ${ref.workflowId}: ${error}`);
    }
  }

  public async restoreWorkflowVersion(
    workflowId: string,
    eventId: string,
    spaceId: string,
    request: KibanaRequest
  ): Promise<RestoreWorkflowVersionResponseDto> {
    await this.ensureInitialized();
    return this.crudService.restoreWorkflowVersion(workflowId, eventId, spaceId, request);
  }

  public async deleteWorkflows(
    ids: string[],
    spaceId: string,
    options?: { force?: boolean; acknowledgeAclLoss?: boolean },
    request?: KibanaRequest
  ): Promise<DeleteWorkflowsResponse> {
    await this.ensureInitialized();
    const result = await this.crudService.deleteWorkflows(ids, spaceId, options, request);
    await Promise.all(
      (result.successfulIds ?? []).map((workflowId) => this.retirePage({ workflowId, spaceId }))
    );
    return result;
  }

  /**
   * Disables all enabled workflows. When `spaceId` is set, only workflows in that
   * space; otherwise across all spaces. Delegated to {@link WorkflowCrudService},
   * which sets `enabled: false`, patches YAML accordingly, and unschedules any
   * scheduled tasks.
   * Used when a user opts out of workflows by toggling the per-space UI setting
   * off, or when availability (license / config) requires a global bulk disable.
   */
  public async disableAllWorkflows(
    spaceId?: string,
    request?: KibanaRequest
  ): Promise<{
    total: number;
    disabled: number;
    failures: Array<{ id: string; error: string }>;
  }> {
    await this.ensureInitialized();
    return this.crudService.disableAllWorkflows(spaceId, request);
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
    options?: {
      includeExecutionHistory?: boolean;
      includeManagedExecutionHistory?: boolean;
      request?: KibanaRequest;
      accessControlFilter?: estypes.QueryDslQueryContainer;
      executionAccessFilter?: estypes.QueryDslQueryContainer;
    }
  ): Promise<WorkflowListDto> {
    await this.ensureInitialized();
    return this.searchService.getWorkflows(params, spaceId, options);
  }

  public async getWorkflowStats(
    spaceId: string,
    options?: {
      includeExecutionStats?: boolean;
      includeManagedExecutionStats?: boolean;
      request?: KibanaRequest;
      accessControlFilter?: estypes.QueryDslQueryContainer;
      executionAccessFilter?: estypes.QueryDslQueryContainer;
    }
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
    options?: { includeInput?: boolean; includeOutput?: boolean; omitStepExecutions?: boolean }
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

  public async getExecutionStepExecutions(
    params: GetExecutionStepExecutionsParams,
    spaceId: string
  ): Promise<GetExecutionStepExecutionsResult> {
    await this.ensureInitialized();
    return this.executionQueryService.getExecutionStepExecutions(params, spaceId);
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
  ): Promise<WorkflowExecutionListDto> {
    await this.ensureInitialized();
    return this.executionQueryService.searchExecutionsView(params, spaceId);
  }

  public async listWaitingForInputSteps(
    spaceId: string,
    pagination: {
      page?: number;
      perPage?: number;
      includeReasoning?: boolean;
      request?: KibanaRequest;
      accessControlFilter?: estypes.QueryDslQueryContainer;
    } = {}
  ): Promise<WaitForInputListResult> {
    await this.ensureInitialized();
    return this.executionQueryService.listWaitingForInputSteps(spaceId, pagination);
  }

  public async listProcessedWaitForInputSteps(
    spaceId: string,
    options: {
      page?: number;
      perPage?: number;
      includeReasoning?: boolean;
      request?: KibanaRequest;
      accessControlFilter?: estypes.QueryDslQueryContainer;
    } & ProcessedWaitForInputFilters = {}
  ): Promise<WaitForInputListResult> {
    await this.ensureInitialized();
    return this.executionQueryService.listProcessedWaitForInputSteps(spaceId, options);
  }

  /** Facet buckets for processed wait-for-input rows. */
  public async listProcessedWaitForInputFacets(
    spaceId: string,
    options: {
      maxBuckets?: number;
      request?: KibanaRequest;
      accessControlFilter?: estypes.QueryDslQueryContainer;
    } = {}
  ): Promise<ProcessedWaitForInputFacets> {
    await this.ensureInitialized();
    return this.executionQueryService.listProcessedWaitForInputFacets(spaceId, options);
  }

  public async markStepAsResponded(
    stepExecutionId: string,
    request: KibanaRequest,
    channel: string | undefined,
    spaceId: string
  ): Promise<boolean> {
    await this.ensureInitialized();
    // Resolve responder identity server-side so callers cannot spoof audit metadata.
    const respondedBy = getAuthenticatedUser(request, this.coreStart?.security);
    return this.executionQueryService.markStepAsResponded(
      stepExecutionId,
      { respondedBy, respondedAt: new Date().toISOString(), channel },
      spaceId
    );
  }

  public async claimHitlStepForExternalResume(
    stepExecutionId: string,
    respondedBy: string,
    spaceId: string
  ): Promise<boolean> {
    await this.ensureInitialized();
    return this.executionQueryService.markStepAsResponded(
      stepExecutionId,
      { respondedBy, respondedAt: new Date().toISOString(), channel: 'external' },
      spaceId
    );
  }

  public async getWaitingStepExecutionId(
    executionId: string,
    spaceId: string
  ): Promise<string | null> {
    await this.ensureInitialized();
    return this.executionQueryService.getWaitingStepExecutionId(executionId, spaceId);
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

  public async getRegisteredCustomTriggerDefinitions(): Promise<ServerTriggerDefinition[]> {
    await this.ensureInitialized();
    return this.validationService.getRegisteredCustomTriggerDefinitions();
  }

  public async validateWorkflow(
    yaml: string,
    spaceId: string,
    request: KibanaRequest,
    options: { includeVariableRules: boolean }
  ): Promise<ValidateWorkflowResponseDto> {
    await this.ensureInitialized();
    return this.validationService.validateWorkflow(yaml, spaceId, request, options);
  }

  public async getWorkflowZodSchema(
    options: { loose?: false },
    spaceId: string,
    request: KibanaRequest
  ): Promise<z.ZodType> {
    await this.ensureInitialized();
    return this.validationService.getWorkflowZodSchema(options, spaceId, request);
  }

  /**
   * Install or update a managed workflow after ES readiness gating.
   * Best-effort: may no-op when Kibana is stopping or ES is not ready (resolve ≠ persisted).
   * Gated skips mark the plugin install pass incomplete so ready() will not orphan-delete.
   */
  public async installManagedWorkflow(
    id: ManagedWorkflowId,
    options: ManagedWorkflowServiceInstallOptions,
    registeredPluginId: string,
    request?: KibanaRequest
  ): Promise<void> {
    await this.ensureInitialized();
    const readiness = await this.ensureManagedInstallReady(`install '${id}'`);
    if (!readiness.ready) {
      // So ready() cannot treat gated-out installs as orphans and force-delete them.
      this.managedWorkflowsService.markInstallIncomplete(registeredPluginId);
      return;
    }
    return this.managedWorkflowsService.installManagedWorkflow(
      id,
      options,
      registeredPluginId,
      request
    );
  }

  public async uninstallManagedWorkflow(
    id: ManagedWorkflowId,
    options: ManagedWorkflowOperationOptions,
    registeredPluginId: string,
    request?: KibanaRequest
  ): Promise<void> {
    await this.ensureInitialized();
    return this.managedWorkflowsService.uninstallManagedWorkflow(
      id,
      options,
      registeredPluginId,
      request
    );
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

  /**
   * Owner signal that static managed installs for this plugin are finished.
   * Best-effort: may no-op when Kibana is stopping or ES is not ready. When installs
   * were incomplete this boot, destructive orphan cleanup is skipped; dynamic auto
   * upgrades still run once this call has passed Elasticsearch readiness.
   */
  public async pluginReady(pluginId: string): Promise<void> {
    await this.ensureInitialized();
    const readiness = await this.ensureManagedInstallReady(`ready() for plugin '${pluginId}'`);
    if (!readiness.ready) {
      return;
    }
    return this.managedWorkflowsService.pluginReady(pluginId);
  }

  public async cleanupUnregisteredOrphans(registeredOwnerPluginIds: string[]): Promise<void> {
    await this.ensureInitialized();
    const readiness = await this.ensureManagedInstallReady('global orphan cleanup');
    if (!readiness.ready) {
      return;
    }
    return this.managedWorkflowsService.cleanupUnregisteredOrphans(registeredOwnerPluginIds);
  }
}
