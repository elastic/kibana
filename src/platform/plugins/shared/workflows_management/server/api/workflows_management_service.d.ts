import type { CoreStart, KibanaRequest, Logger, StartServicesAccessor } from '@kbn/core/server';
import type { CreateWorkflowCommand, EsWorkflow, EsWorkflowStepExecution, ExecutionStatus, ExecutionType, UpdatedWorkflowResponseDto, ValidateWorkflowResponseDto, WorkflowAggsDto, WorkflowDetailDto, WorkflowExecutionDto, WorkflowExecutionHistoryModel, WorkflowExecutionListDto, WorkflowExecutionSortField, WorkflowExecutionSortOrder, WorkflowListDto, WorkflowStatsDto } from '@kbn/workflows';
import type { ManagedWorkflowId } from '@kbn/workflows/managed';
import type { ExecuteManagedWorkflowOptions, ManagedWorkflowOperationOptions } from '@kbn/workflows/server/types';
import type { ChildWorkflowExecutionItem, GetAvailableConnectorsResponse, WorkflowPartialDetailDto } from '@kbn/workflows/types/v1';
import type { LogSearchResult, WorkflowsExecutionEnginePluginStart } from '@kbn/workflows-execution-engine/server';
import type { ExecutionLogsParams, StepLogsParams } from '@kbn/workflows-execution-engine/server/workflow_event_logger/types';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import type { z } from '@kbn/zod/v4';
import type { StepExecutionListResult } from './lib/search_step_executions';
import type { DeleteWorkflowsResponse, GetStepExecutionParams, GetWorkflowsParams, SearchStepExecutionsParams } from './workflows_management_api';
import type { BulkFailureEntry } from '../lib/bulk_id_helpers';
import type { WorkflowsServerPluginStartDeps } from '../types';
export interface SearchWorkflowExecutionsParams {
    workflowId: string;
    statuses?: ExecutionStatus[];
    executionTypes?: ExecutionType[];
    executedBy?: string[];
    concurrencyGroupKey?: string;
    omitStepRuns?: boolean;
    finishedAfter?: string;
    finishedBefore?: string;
    sortField?: WorkflowExecutionSortField;
    sortOrder?: WorkflowExecutionSortOrder;
    page?: number;
    size?: number;
}
export declare class WorkflowsService {
    private readonly logger;
    private coreStart;
    private pluginsStart;
    private workflowsExecutionEngine;
    private workflowsExtensions;
    private workflowStorage;
    private taskScheduler;
    private esClient;
    private validationService;
    private executionQueryService;
    private searchService;
    private crudService;
    private managedWorkflowsService;
    private getActionsClient;
    private getActionsClientWithRequest;
    private readonly initPromise;
    constructor(startServices: StartServicesAccessor<WorkflowsServerPluginStartDeps>, logger: Logger);
    private ensureInitialized;
    private initialize;
    getWorkflowsExecutionEngine(): Promise<WorkflowsExecutionEnginePluginStart>;
    getWorkflowsExtensions(): Promise<WorkflowsExtensionsServerPluginStart>;
    getCoreStart(): Promise<CoreStart>;
    getPluginsStart(): Promise<WorkflowsServerPluginStartDeps>;
    getWorkflow(id: string, spaceId: string, options?: {
        includeDeleted?: boolean;
    }): Promise<WorkflowDetailDto | null>;
    getWorkflowsByIds(ids: string[], spaceId: string, options?: {
        includeDeleted?: boolean;
    }): Promise<WorkflowDetailDto[]>;
    getWorkflowsSourceByIds(ids: string[], spaceId: string, source?: string[], options?: {
        includeDeleted?: boolean;
    }): Promise<WorkflowPartialDetailDto[]>;
    createWorkflow(workflow: CreateWorkflowCommand, spaceId: string, request: KibanaRequest): Promise<WorkflowDetailDto>;
    bulkCreateWorkflows(workflows: CreateWorkflowCommand[], spaceId: string, request: KibanaRequest, options?: {
        overwrite?: boolean;
    }): Promise<{
        created: WorkflowDetailDto[];
        failed: BulkFailureEntry[];
    }>;
    updateWorkflow(id: string, workflow: Partial<EsWorkflow>, spaceId: string, request: KibanaRequest): Promise<UpdatedWorkflowResponseDto>;
    deleteWorkflows(ids: string[], spaceId: string, options?: {
        force?: boolean;
    }): Promise<DeleteWorkflowsResponse>;
    /**
     * Disables all enabled workflows. When `spaceId` is set, only workflows in that
     * space; otherwise across all spaces. Delegated to {@link WorkflowCrudService},
     * which sets `enabled: false`, patches YAML accordingly, and unschedules any
     * scheduled tasks.
     * Used when a user opts out of workflows by toggling the per-space UI setting
     * off, or when availability (license / config) requires a global bulk disable.
     */
    disableAllWorkflows(spaceId?: string): Promise<{
        total: number;
        disabled: number;
        failures: Array<{
            id: string;
            error: string;
        }>;
    }>;
    getWorkflowsSubscribedToTrigger(triggerId: string, spaceId: string): Promise<WorkflowDetailDto[]>;
    getWorkflows(params: GetWorkflowsParams, spaceId: string, options?: {
        includeExecutionHistory?: boolean;
    }): Promise<WorkflowListDto>;
    getWorkflowStats(spaceId: string, options?: {
        includeExecutionStats?: boolean;
    }): Promise<WorkflowStatsDto>;
    getWorkflowAggs(fields: string[], spaceId: string): Promise<WorkflowAggsDto>;
    getWorkflowExecution(executionId: string, spaceId: string, options?: {
        includeInput?: boolean;
        includeOutput?: boolean;
    }): Promise<WorkflowExecutionDto | null>;
    getChildWorkflowExecutions(parentExecutionId: string, spaceId: string): Promise<ChildWorkflowExecutionItem[]>;
    getWorkflowExecutions(params: SearchWorkflowExecutionsParams, spaceId: string): Promise<WorkflowExecutionListDto>;
    listWaitingForInputSteps(spaceId: string, pagination?: {
        page?: number;
        perPage?: number;
    }): Promise<{
        results: EsWorkflowStepExecution[];
        total: number;
    }>;
    getWorkflowExecutionHistory(executionId: string, spaceId: string): Promise<WorkflowExecutionHistoryModel[]>;
    getStepExecutions(params: GetStepExecutionParams, spaceId: string): Promise<EsWorkflowStepExecution[]>;
    searchStepExecutions(params: SearchStepExecutionsParams, spaceId: string): Promise<StepExecutionListResult>;
    getExecutionLogs(params: ExecutionLogsParams): Promise<LogSearchResult>;
    getStepLogs(params: StepLogsParams): Promise<LogSearchResult>;
    getStepExecution(params: GetStepExecutionParams, spaceId: string): Promise<EsWorkflowStepExecution | null>;
    getAvailableConnectors(spaceId: string, request: KibanaRequest): Promise<GetAvailableConnectorsResponse>;
    validateWorkflow(yaml: string, spaceId: string, request: KibanaRequest): Promise<ValidateWorkflowResponseDto>;
    getWorkflowZodSchema(options: {
        loose?: false;
    }, spaceId: string, request: KibanaRequest): Promise<z.ZodType>;
    installManagedWorkflow(id: ManagedWorkflowId, options: ManagedWorkflowOperationOptions, registeredPluginId: string): Promise<void>;
    uninstallManagedWorkflow(id: ManagedWorkflowId, options: ManagedWorkflowOperationOptions, registeredPluginId: string): Promise<void>;
    executeManagedWorkflow(id: ManagedWorkflowId, request: KibanaRequest, options: ExecuteManagedWorkflowOptions, registeredPluginId: string): Promise<string>;
    pluginReady(pluginId: string): Promise<void>;
    cleanupUnregisteredOrphans(registeredOwnerPluginIds: string[]): Promise<void>;
}
