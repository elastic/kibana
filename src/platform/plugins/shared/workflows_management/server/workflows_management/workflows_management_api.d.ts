import type { KibanaRequest } from '@kbn/core/server';
import type { ConnectorTypeInfo, CreateWorkflowCommand, EsWorkflow, EsWorkflowStepExecution, UpdatedWorkflowResponseDto, WorkflowDetailDto, WorkflowExecutionDto, WorkflowExecutionEngineModel, WorkflowExecutionListDto, WorkflowListDto } from '@kbn/workflows';
import type { WorkflowsExecutionEnginePluginStart } from '@kbn/workflows-execution-engine/server';
import type { z } from '@kbn/zod/v4';
import type { ChildWorkflowExecutionItem } from './lib/get_child_workflow_executions';
import type { StepExecutionListResult } from './lib/search_step_executions';
import type { SearchWorkflowExecutionsParams, WorkflowsService } from './workflows_management_service';
import type { ValidateWorkflowResponse } from '../../common/lib/validate_workflow_yaml';
export interface GetWorkflowsParams {
    triggerType?: 'schedule' | 'event' | 'manual';
    size: number;
    page: number;
    createdBy?: string[];
    enabled?: boolean[];
    tags?: string[];
    query?: string;
    _full?: boolean;
}
export interface DeleteWorkflowsResponse {
    total: number;
    deleted: number;
    failures: Array<{
        id: string;
        error: string;
    }>;
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
export interface GetAvailableConnectorsResponse {
    connectorsByType: Record<string, ConnectorTypeInfo>;
    totalConnectors: number;
}
export interface TestWorkflowParams {
    workflowId?: string;
    workflowYaml?: string;
    inputs: Record<string, any>;
    spaceId: string;
    request: KibanaRequest;
}
export declare class WorkflowsManagementApi {
    private readonly workflowsService;
    private readonly getWorkflowsExecutionEngine;
    constructor(workflowsService: WorkflowsService, getWorkflowsExecutionEngine: () => Promise<WorkflowsExecutionEnginePluginStart>);
    getWorkflows(params: GetWorkflowsParams, spaceId: string): Promise<WorkflowListDto>;
    /**
     * Returns all enabled workflows in the space that are subscribed to the given trigger type.
     * Used by the event-driven handler to resolve which workflows to run when an event is emitted.
     */
    getWorkflowsSubscribedToTrigger(triggerId: string, spaceId: string): Promise<WorkflowDetailDto[]>;
    getWorkflow(id: string, spaceId: string): Promise<WorkflowDetailDto | null>;
    createWorkflow(workflow: CreateWorkflowCommand, spaceId: string, request: KibanaRequest): Promise<WorkflowDetailDto>;
    bulkCreateWorkflows(workflows: CreateWorkflowCommand[], spaceId: string, request: KibanaRequest): Promise<{
        created: WorkflowDetailDto[];
        failed: Array<{
            index: number;
            error: string;
        }>;
    }>;
    cloneWorkflow(workflow: WorkflowDetailDto, spaceId: string, request: KibanaRequest): Promise<WorkflowDetailDto>;
    updateWorkflow(id: string, workflow: Partial<EsWorkflow>, spaceId: string, request: KibanaRequest): Promise<UpdatedWorkflowResponseDto | null>;
    deleteWorkflows(workflowIds: string[], spaceId: string, request: KibanaRequest): Promise<DeleteWorkflowsResponse>;
    runWorkflow(workflow: WorkflowExecutionEngineModel, spaceId: string, inputs: Record<string, any>, request: KibanaRequest, triggeredBy?: string, metadata?: Record<string, unknown>): Promise<string>;
    scheduleWorkflow(workflow: WorkflowExecutionEngineModel, spaceId: string, inputs: Record<string, any>, request: KibanaRequest, triggeredBy: string): Promise<string>;
    testWorkflow({ workflowId, workflowYaml, inputs, spaceId, request, }: TestWorkflowParams): Promise<string>;
    testStep(workflowYaml: string, stepId: string, workflowId: string | undefined, contextOverride: Record<string, any>, spaceId: string, request: KibanaRequest): Promise<string>;
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
    cancelWorkflowExecution(workflowExecutionId: string, spaceId: string): Promise<void>;
    resumeWorkflowExecution(executionId: string, spaceId: string, input: Record<string, unknown>, request: KibanaRequest): Promise<void>;
    getWorkflowStats(spaceId: string): Promise<import("@kbn/workflows").WorkflowStatsDto>;
    getWorkflowAggs(fields: string[] | undefined, spaceId: string): Promise<import("@kbn/workflows").WorkflowAggsDto>;
    getAvailableConnectors(spaceId: string, request: KibanaRequest): Promise<GetAvailableConnectorsResponse>;
    getWorkflowJsonSchema({ loose }: {
        loose: boolean;
    }, spaceId: string, request: KibanaRequest): Promise<z.core.JSONSchema.JSONSchema | null>;
    validateWorkflow(yaml: string, spaceId: string, request: KibanaRequest): Promise<ValidateWorkflowResponse>;
    private isStepExecution;
}
