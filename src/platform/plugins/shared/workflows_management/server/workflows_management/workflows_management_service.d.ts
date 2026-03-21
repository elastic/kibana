import type { CoreStart, KibanaRequest, Logger, SecurityServiceStart } from '@kbn/core/server';
import type { CreateWorkflowCommand, EsWorkflow, EsWorkflowStepExecution, ExecutionStatus, UpdatedWorkflowResponseDto, WorkflowAggsDto, WorkflowDetailDto, WorkflowExecutionDto, WorkflowExecutionHistoryModel, WorkflowExecutionListDto, WorkflowListDto, WorkflowStatsDto } from '@kbn/workflows';
import { ExecutionType } from '@kbn/workflows';
import type { LogSearchResult } from '@kbn/workflows-execution-engine/server';
import type { ExecutionLogsParams, StepLogsParams } from '@kbn/workflows-execution-engine/server/workflow_event_logger/types';
import type { z } from '@kbn/zod/v4';
import { type ChildWorkflowExecutionItem } from './lib/get_child_workflow_executions';
import { type StepExecutionListResult } from './lib/search_step_executions';
import type { DeleteWorkflowsResponse, GetAvailableConnectorsResponse, GetStepExecutionParams, GetWorkflowsParams, SearchStepExecutionsParams } from './workflows_management_api';
import type { ValidateWorkflowResponse } from '../../common/lib/validate_workflow_yaml';
import type { WorkflowTaskScheduler } from '../tasks/workflow_task_scheduler';
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
export declare class WorkflowsService {
    private esClient;
    private workflowStorage;
    private workflowEventLoggerService;
    private taskScheduler;
    private readonly logger;
    private security?;
    private workflowsExtensions;
    private getActionsClient;
    private getActionsClientWithRequest;
    private readonly initPromise;
    constructor(logger: Logger, getCoreStart: () => Promise<CoreStart>, getPluginsStart: () => Promise<WorkflowsServerPluginStartDeps>);
    setTaskScheduler(taskScheduler: WorkflowTaskScheduler): void;
    setSecurityService(security: SecurityServiceStart): void;
    private ensureInitialized;
    private initialize;
    getWorkflow(id: string, spaceId: string): Promise<WorkflowDetailDto | null>;
    /**
     * Parses and validates a workflow YAML, returning the prepared document and metadata.
     * Shared by createWorkflow and bulkCreateWorkflows.
     * When triggerDefinitions is provided, custom trigger on.condition values are validated
     * (valid KQL and only event schema properties).
     */
    private prepareWorkflowDocument;
    /**
     * Schedules triggers for a workflow. Used by both createWorkflow and bulkCreateWorkflows.
     */
    private scheduleWorkflowTriggers;
    createWorkflow(workflow: CreateWorkflowCommand, spaceId: string, request: KibanaRequest): Promise<WorkflowDetailDto>;
    bulkCreateWorkflows(workflows: CreateWorkflowCommand[], spaceId: string, request: KibanaRequest): Promise<{
        created: WorkflowDetailDto[];
        failed: Array<{
            index: number;
            error: string;
        }>;
    }>;
    /**
     * Fetches the workflow document by id and spaceId, or throws if not found.
     */
    private getExistingWorkflowDocument;
    /**
     * Validates workflow YAML and produces the update patch and validation errors.
     * Used by updateWorkflow when workflow.yaml is provided.
     */
    private applyYamlUpdate;
    /**
     * Builds the update patch when only individual fields (name, enabled, description, tags) are updated.
     * Used by updateWorkflow when workflow.yaml is not provided.
     */
    private applyFieldUpdates;
    /**
     * Updates or removes scheduled tasks after a workflow document is saved.
     * Call only when shouldUpdateScheduler is true and taskScheduler is set.
     */
    private updateSchedulerAfterWorkflowSave;
    updateWorkflow(id: string, workflow: Partial<EsWorkflow>, spaceId: string, request: KibanaRequest): Promise<UpdatedWorkflowResponseDto>;
    deleteWorkflows(ids: string[], spaceId: string): Promise<DeleteWorkflowsResponse>;
    /**
     * Returns all enabled, non-deleted workflows in the space that are subscribed to the given trigger type.
     * Used by the event-driven handler to resolve which workflows to run when an event is emitted.
     */
    getWorkflowsSubscribedToTrigger(triggerId: string, spaceId: string): Promise<WorkflowDetailDto[]>;
    getWorkflows(params: GetWorkflowsParams, spaceId: string): Promise<WorkflowListDto>;
    getWorkflowStats(spaceId: string): Promise<WorkflowStatsDto>;
    private getExecutionHistoryStats;
    getWorkflowAggs(fields: string[], spaceId: string): Promise<WorkflowAggsDto>;
    getWorkflowExecution(executionId: string, spaceId: string, options?: {
        includeInput?: boolean;
        includeOutput?: boolean;
    }): Promise<WorkflowExecutionDto | null>;
    getChildWorkflowExecutions(parentExecutionId: string, spaceId: string): Promise<ChildWorkflowExecutionItem[]>;
    getWorkflowExecutions(params: SearchWorkflowExecutionsParams, spaceId: string): Promise<WorkflowExecutionListDto>;
    getWorkflowExecutionHistory(executionId: string, spaceId: string): Promise<WorkflowExecutionHistoryModel[]>;
    /**
     * Efficiently fetch the most recent execution for multiple workflows
     */
    private getRecentExecutionsForWorkflows;
    getStepExecutions(params: GetStepExecutionParams, spaceId: string): Promise<EsWorkflowStepExecution[]>;
    searchStepExecutions(params: SearchStepExecutionsParams, spaceId: string): Promise<StepExecutionListResult>;
    getExecutionLogs(params: ExecutionLogsParams): Promise<LogSearchResult>;
    getStepLogs(params: StepLogsParams): Promise<LogSearchResult>;
    getStepExecution(params: GetStepExecutionParams, spaceId: string): Promise<EsWorkflowStepExecution | null>;
    private transformStorageDocumentToWorkflowDto;
    private validateWorkflowId;
    private generateWorkflowId;
    getAvailableConnectors(spaceId: string, request: KibanaRequest): Promise<GetAvailableConnectorsResponse>;
    private getConnectorInstanceConfig;
    validateWorkflow(yaml: string, spaceId: string, request: KibanaRequest): Promise<ValidateWorkflowResponse>;
    getWorkflowZodSchema(options: {
        loose?: false;
    }, spaceId: string, request: KibanaRequest): Promise<z.ZodType>;
}
