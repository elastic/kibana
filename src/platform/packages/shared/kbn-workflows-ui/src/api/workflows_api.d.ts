import type { HttpSetup } from '@kbn/core/public';
import type { ChildWorkflowExecutionItem, CreateWorkflowCommand, EsWorkflowStepExecution, GetAvailableConnectorsResponse, RunStepCommand, RunWorkflowResponseDto, TestWorkflowResponseDto, UpdatedWorkflowResponseDto, ValidateWorkflowResponseDto, WorkflowAggsDto, WorkflowDetailDto, WorkflowExecutionDto, WorkflowExecutionListDto, WorkflowListDto, WorkflowMgetResponseDto, WorkflowsSearchParams, WorkflowStatsDto, WorkflowStepExecutionListDto } from '@kbn/workflows';
import type { TemplateBody } from '@kbn/workflows-library';
import type { z } from '@kbn/zod/v4';
import type { BulkCreateWorkflowsParams, BulkCreateWorkflowsResponse, CheckWorkflowIdConflictsParams, CheckWorkflowIdConflictsResponse, ExportWorkflowsParams, ExportWorkflowsResponse, GetAggsParams, GetCatalogParams, GetCatalogResponse, GetExecutionLogsParams, GetExecutionParams, GetLibraryHealthResponse, GetSchemaParams, GetWorkflowExecutionsParams, GetWorkflowStepExecutionsParams, InstallTemplateResponse, MgetWorkflowsParams, RestoreWorkflowVersionParams, RestoreWorkflowVersionResponseDto, ResumeExecutionParams, RunWorkflowOptions, SearchTriggerEventLogParams, SearchTriggerEventLogResult, TestWorkflowParams, UpdateWorkflowParams, ValidateWorkflowParams, WorkflowExecutionLogsResponse, WorkflowsConfig } from './types';
export declare class WorkflowApi {
    private readonly http;
    constructor(http: HttpSetup);
    getWorkflows(params?: WorkflowsSearchParams): Promise<WorkflowListDto>;
    getWorkflow(id: string): Promise<WorkflowDetailDto>;
    createWorkflow(params: CreateWorkflowCommand): Promise<WorkflowDetailDto>;
    updateWorkflow(id: string, params: UpdateWorkflowParams): Promise<UpdatedWorkflowResponseDto>;
    deleteWorkflow(id: string): Promise<void>;
    bulkCreateWorkflows({ workflows, overwrite, }: BulkCreateWorkflowsParams): Promise<BulkCreateWorkflowsResponse>;
    bulkDeleteWorkflows(ids: string[]): Promise<void>;
    mgetWorkflows({ ids, source }: MgetWorkflowsParams): Promise<WorkflowMgetResponseDto>;
    /**
     * Returns the subset of the given candidate workflow IDs that already exist
     * in the index, including soft-deleted tombstones and cross-space documents.
     * Used by the import preflight to detect conflicts before the user commits.
     *
     * Implemented as `dryRun=true` on the bulk-create endpoint so no new route
     * is needed — the same import path is reused for both the preflight check and
     * the actual import.
     */
    checkWorkflowIdConflicts({ workflows, }: CheckWorkflowIdConflictsParams): Promise<CheckWorkflowIdConflictsResponse>;
    cloneWorkflow(id: string): Promise<WorkflowDetailDto>;
    validateWorkflow({ yaml }: ValidateWorkflowParams): Promise<ValidateWorkflowResponseDto>;
    exportWorkflows({ ids }: ExportWorkflowsParams): Promise<ExportWorkflowsResponse>;
    getStats(): Promise<WorkflowStatsDto>;
    getAggs({ fields, managed }: GetAggsParams): Promise<WorkflowAggsDto>;
    getConnectors(): Promise<GetAvailableConnectorsResponse>;
    getSchema({ loose }: GetSchemaParams): Promise<z.core.JSONSchema.JSONSchema | null>;
    runWorkflow(id: string, { inputs, metadata }: RunWorkflowOptions): Promise<RunWorkflowResponseDto>;
    testWorkflow(params: TestWorkflowParams): Promise<TestWorkflowResponseDto>;
    testStep(params: RunStepCommand): Promise<TestWorkflowResponseDto>;
    getWorkflowExecutions(workflowId: string, params?: GetWorkflowExecutionsParams): Promise<WorkflowExecutionListDto>;
    getWorkflowStepExecutions(workflowId: string, params?: GetWorkflowStepExecutionsParams): Promise<WorkflowStepExecutionListDto>;
    getExecution(executionId: string, params?: GetExecutionParams): Promise<WorkflowExecutionDto>;
    cancelExecution(executionId: string): Promise<void>;
    cancelAllWorkflowExecutions(workflowId: string): Promise<void>;
    getStepExecution(executionId: string, stepExecutionId: string): Promise<EsWorkflowStepExecution>;
    resumeExecution(executionId: string, { input }: ResumeExecutionParams): Promise<void>;
    getExecutionLogs(executionId: string, params?: GetExecutionLogsParams): Promise<WorkflowExecutionLogsResponse>;
    getChildrenExecutions(executionId: string): Promise<ChildWorkflowExecutionItem[]>;
    getConfig(): Promise<WorkflowsConfig>;
    searchTriggerEvents(params: SearchTriggerEventLogParams): Promise<SearchTriggerEventLogResult>;
    getCatalog(params?: GetCatalogParams): Promise<GetCatalogResponse>;
    getTemplate(slug: string): Promise<TemplateBody>;
    getLibraryHealth(): Promise<GetLibraryHealthResponse>;
    installTemplate(slug: string, values: Record<string, unknown>): Promise<InstallTemplateResponse>;
    restoreWorkflowVersion(workflowId: string, eventId: string, { signal }?: RestoreWorkflowVersionParams): Promise<RestoreWorkflowVersionResponseDto>;
}
