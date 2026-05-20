import type { SmlIndexAttachmentParams } from '@kbn/agent-context-layer-plugin/server';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { BulkScheduleWorkflowResult, CreateWorkflowCommand, EsWorkflow, EsWorkflowStepExecution, GetAvailableConnectorsResponse, ResumeWorkflowExecutionResponseDto, UpdatedWorkflowResponseDto, ValidateWorkflowResponseDto, WorkflowDetailDto, WorkflowExecutionDto, WorkflowExecutionEngineModel, WorkflowExecutionEventDispatchMetadata, WorkflowExecutionListDto, WorkflowListDto } from '@kbn/workflows';
import type { ChildWorkflowExecutionItem, WorkflowPartialDetailDto } from '@kbn/workflows/types/v1';
import type { z } from '@kbn/zod/v4';
import type { StepExecutionListResult } from './lib/search_step_executions';
import type { SearchWorkflowExecutionsParams, WorkflowsService } from './workflows_management_service';
export type SmlIndexAttachmentFn = (params: SmlIndexAttachmentParams) => Promise<void>;
export interface GetWorkflowsParams {
    triggerType?: 'schedule' | 'event' | 'manual';
    size: number;
    page: number;
    createdBy?: string[];
    enabled?: boolean[];
    tags?: string[];
    query?: string;
    managedFilter?: 'all' | 'managed' | 'unmanaged';
    _full?: boolean;
}
export interface DeleteWorkflowsResponse {
    total: number;
    deleted: number;
    failures: Array<{
        id: string;
        error: string;
    }>;
    /**
     * Workflow ids successfully soft-deleted in Elasticsearch. Used server-side for audit logging;
     * bulk delete route omits this field from the HTTP JSON body so the public API shape is unchanged.
     */
    successfulIds?: string[];
}
export interface GetWorkflowExecutionLogsParams {
    executionId: string;
    stepExecutionId?: string;
    size?: number;
    page?: number;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
}
export interface WorkflowExecutionLogEntry {
    id: string;
    timestamp: string;
    level?: 'trace' | 'debug' | 'info' | 'warn' | 'error';
    message: string;
    stepId?: string;
    stepName?: string;
    connectorType?: string;
    duration?: number;
    additionalData?: Record<string, any>;
}
export interface WorkflowExecutionLogsDto {
    logs: WorkflowExecutionLogEntry[];
    total: number;
    size: number;
    page: number;
}
export interface GetStepExecutionParams {
    executionId: string;
    id: string;
}
export interface SearchStepExecutionsParams {
    workflowId: string;
    stepId?: string;
    includeInput?: boolean;
    includeOutput?: boolean;
    page?: number;
    size?: number;
}
export interface GetAvailableConnectorsParams {
    spaceId: string;
    request: KibanaRequest;
}
export interface TestWorkflowParams {
    workflowId?: string;
    workflowYaml?: string;
    inputs: Record<string, any>;
    spaceId: string;
    request: KibanaRequest;
}
export interface BulkScheduleWorkflowItem {
    workflow: WorkflowExecutionEngineModel;
    spaceId: string;
    inputs: Record<string, unknown>;
    triggeredBy: string;
    metadata?: WorkflowExecutionEventDispatchMetadata;
}
export declare class WorkflowsManagementApi {
    private readonly workflowsService;
    readonly isWorkflowsAvailable: boolean;
    private smlIndexAttachment;
    private smlLogger;
    constructor(workflowsService: WorkflowsService, isWorkflowsAvailable: boolean);
    private getWorkflowsExecutionEngine;
    setSmlIndexAttachment(fn: SmlIndexAttachmentFn, logger: Logger): void;
    private notifySml;
    getWorkflows(params: GetWorkflowsParams, spaceId: string, options?: {
        includeExecutionHistory?: boolean;
    }): Promise<WorkflowListDto>;
    /**
     * Returns all enabled workflows in the space that are subscribed to the given trigger type.
     * Used by the event-driven handler to resolve which workflows to run when an event is emitted.
     */
    getWorkflowsSubscribedToTrigger(triggerId: string, spaceId: string): Promise<WorkflowDetailDto[]>;
    getWorkflow(id: string, spaceId: string): Promise<WorkflowDetailDto | null>;
    getWorkflowsByIds(ids: string[], spaceId: string): Promise<WorkflowDetailDto[]>;
    getWorkflowsSourceByIds(ids: string[], spaceId: string, source?: string[]): Promise<WorkflowPartialDetailDto[]>;
    createWorkflow(workflow: CreateWorkflowCommand, spaceId: string, request: KibanaRequest): Promise<WorkflowDetailDto>;
    bulkCreateWorkflows(workflows: CreateWorkflowCommand[], spaceId: string, request: KibanaRequest, options?: {
        overwrite?: boolean;
    }): Promise<{
        created: WorkflowDetailDto[];
        failed: Array<{
            index: number;
            id: string;
            error: string;
        }>;
    }>;
    cloneWorkflow(workflow: WorkflowDetailDto, spaceId: string, request: KibanaRequest): Promise<WorkflowDetailDto>;
    updateWorkflow(id: string, workflow: Partial<EsWorkflow>, spaceId: string, request: KibanaRequest): Promise<UpdatedWorkflowResponseDto>;
    deleteWorkflows(workflowIds: string[], spaceId: string, request: KibanaRequest, options?: {
        force?: boolean;
    }): Promise<DeleteWorkflowsResponse>;
    disableAllWorkflows(spaceId?: string): Promise<{
        total: number;
        disabled: number;
        failures: Array<{
            id: string;
            error: string;
        }>;
    }>;
    runWorkflow(workflow: WorkflowExecutionEngineModel, spaceId: string, inputs: Record<string, any>, request: KibanaRequest, triggeredBy?: string, metadata?: Record<string, unknown>): Promise<string>;
    scheduleWorkflow(workflow: WorkflowExecutionEngineModel, spaceId: string, inputs: Record<string, any>, request: KibanaRequest, triggeredBy: string, metadata?: WorkflowExecutionEventDispatchMetadata): Promise<string>;
    bulkScheduleWorkflow(items: BulkScheduleWorkflowItem[], request: KibanaRequest): Promise<BulkScheduleWorkflowResult>;
    testWorkflow({ workflowId, workflowYaml, inputs, spaceId, request, }: TestWorkflowParams): Promise<string>;
    testStep(workflowYaml: string, stepId: string, workflowId: string | undefined, executionContext: Record<string, unknown> | undefined, contextOverride: Record<string, any>, spaceId: string, request: KibanaRequest): Promise<string>;
    getWorkflowExecutions(params: SearchWorkflowExecutionsParams, spaceId: string): Promise<WorkflowExecutionListDto>;
    getWorkflowExecution(workflowExecutionId: string, spaceId: string, options?: {
        includeInput?: boolean;
        includeOutput?: boolean;
    }): Promise<WorkflowExecutionDto | null>;
    getChildWorkflowExecutions(parentExecutionId: string, spaceId: string): Promise<ChildWorkflowExecutionItem[]>;
    getWorkflowExecutionLogs(params: {
        executionId: string;
        spaceId: string;
        size: number;
        page: number;
        stepExecutionId?: string;
        sortField?: string;
        sortOrder?: 'asc' | 'desc';
    }): Promise<WorkflowExecutionLogsDto>;
    getStepExecution(params: GetStepExecutionParams, spaceId: string): Promise<EsWorkflowStepExecution | null>;
    searchStepExecutions(params: SearchStepExecutionsParams, spaceId: string): Promise<StepExecutionListResult>;
    cancelWorkflowExecution(workflowExecutionId: string, spaceId: string, request?: KibanaRequest): Promise<void>;
    cancelAllActiveWorkflowExecutions(workflowId: string, spaceId: string): Promise<void>;
    resumeWorkflowExecution(executionId: string, spaceId: string, input: Record<string, unknown>, request: KibanaRequest): Promise<ResumeWorkflowExecutionResponseDto>;
    /**
     * Cross-workflow listing of step executions currently blocked on
     * `waitForInput`. Consumed by the Inbox plugin's workflows provider.
     */
    listWaitingForInputSteps(spaceId: string, params?: {
        page?: number;
        perPage?: number;
    }): Promise<{
        results: EsWorkflowStepExecution[];
        total: number;
    }>;
    getWorkflowStats(spaceId: string, options?: {
        includeExecutionStats?: boolean;
    }): Promise<import("@kbn/workflows").WorkflowStatsDto>;
    getWorkflowAggs(fields: string[] | undefined, spaceId: string): Promise<import("@kbn/workflows").WorkflowAggsDto>;
    getAvailableConnectors(spaceId: string, request: KibanaRequest): Promise<GetAvailableConnectorsResponse>;
    getWorkflowJsonSchema({ loose }: {
        loose: boolean;
    }, spaceId: string, request: KibanaRequest): Promise<z.core.JSONSchema.JSONSchema | null>;
    validateWorkflow(yaml: string, spaceId: string, request: KibanaRequest): Promise<ValidateWorkflowResponseDto>;
    private isStepExecution;
}
