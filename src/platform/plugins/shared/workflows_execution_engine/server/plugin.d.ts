import type { CoreSetup, CoreStart, KibanaRequest, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { BulkScheduleWorkflowResult, WorkflowExecutionEngineModel } from '@kbn/workflows';
import type { CancelAllActiveWorkflowExecutions, CancelWorkflowExecution, ExecuteWorkflow, ExecuteWorkflowStep, ResumeWorkflowExecution, ScheduleWorkflow, TriggerEventsContract, WorkflowsExecutionEnginePluginSetup, WorkflowsExecutionEnginePluginSetupDeps, WorkflowsExecutionEnginePluginStart, WorkflowsExecutionEnginePluginStartDeps } from './types';
import type { WorkflowEventLoggerService } from './workflow_event_logger';
export declare class WorkflowsExecutionEnginePlugin implements Plugin<WorkflowsExecutionEnginePluginSetup, WorkflowsExecutionEnginePluginStart, WorkflowsExecutionEnginePluginSetupDeps, WorkflowsExecutionEnginePluginStartDeps> {
    private readonly logger;
    private readonly config;
    private concurrencyManager;
    private setupDependencies?;
    private coreSetup?;
    private meteringService?;
    private initializePromise?;
    /** Set in start(); used by task runners to pass parent-resume into run/resume without exposing it on the public plugin contract. */
    private internalResumeWorkflowExecutionHandler?;
    constructor(initializerContext: PluginInitializerContext);
    setup(core: CoreSetup<WorkflowsExecutionEnginePluginStartDeps, WorkflowsExecutionEnginePluginStart>, plugins: WorkflowsExecutionEnginePluginSetupDeps): {};
    start(coreStart: CoreStart, plugins: WorkflowsExecutionEnginePluginStartDeps): {
        workflowEventLoggerService: WorkflowEventLoggerService;
        executeWorkflow: ExecuteWorkflow;
        executeWorkflowStep: ExecuteWorkflowStep;
        scheduleWorkflow: ScheduleWorkflow;
        bulkScheduleWorkflow: (items: Array<{
            workflow: WorkflowExecutionEngineModel;
            context: Record<string, unknown>;
        }>, request: KibanaRequest) => Promise<BulkScheduleWorkflowResult>;
        cancelWorkflowExecution: CancelWorkflowExecution;
        cancelAllActiveWorkflowExecutions: CancelAllActiveWorkflowExecutions;
        resumeWorkflowExecution: ResumeWorkflowExecution;
        triggerEvents: TriggerEventsContract;
    };
    stop(): void;
    private initialize;
    /**
     * Reused local wrapper for evaluating the concurrency group key for a workflow execution.
     * Normalizes the partial workflowExecution to build the workflow context needed for template evaluation.
     *
     * @param workflowExecution - The partial workflow execution
     * @param concurrencySettings - The concurrency settings from workflow definition
     * @param coreStart - Core start services
     * @param dependencies - Context dependencies for building workflow context
     * @returns The evaluated concurrency group key, or null if not applicable
     */
    private getConcurrencyGroupKey;
    private buildManagedWorkflowExecutionMetadata;
    /**
     * Checks concurrency limits and applies collision strategy if needed.
     * This helper method consolidates the duplicated concurrency check logic.
     *
     * For 'drop' strategy: if limit is exceeded, ConcurrencyManager marks execution as SKIPPED.
     * For 'cancel-in-progress' strategy: ConcurrencyManager cancels old executions to make room.
     *
     * @param workflowExecution - The workflow execution (might be partial)
     * @returns Promise<boolean> - true if execution can proceed, false if it should be dropped
     */
    private checkConcurrencyIfNeeded;
}
