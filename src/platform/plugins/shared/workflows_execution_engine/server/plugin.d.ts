import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { CancelWorkflowExecution, ExecuteWorkflow, ExecuteWorkflowStep, ResumeWorkflowExecution, ScheduleWorkflow, WorkflowsExecutionEnginePluginSetup, WorkflowsExecutionEnginePluginSetupDeps, WorkflowsExecutionEnginePluginStart, WorkflowsExecutionEnginePluginStartDeps } from './types';
import { WorkflowEventLoggerService } from './workflow_event_logger';
export declare class WorkflowsExecutionEnginePlugin implements Plugin<WorkflowsExecutionEnginePluginSetup, WorkflowsExecutionEnginePluginStart, WorkflowsExecutionEnginePluginSetupDeps, WorkflowsExecutionEnginePluginStartDeps> {
    private readonly logger;
    private readonly config;
    private concurrencyManager;
    private setupDependencies?;
    private coreSetup?;
    private meteringService?;
    private initializePromise?;
    constructor(initializerContext: PluginInitializerContext);
    setup(core: CoreSetup<WorkflowsExecutionEnginePluginStartDeps, WorkflowsExecutionEnginePluginStart>, plugins: WorkflowsExecutionEnginePluginSetupDeps): {};
    start(coreStart: CoreStart, plugins: WorkflowsExecutionEnginePluginStartDeps): {
        workflowEventLoggerService: WorkflowEventLoggerService;
        executeWorkflow: ExecuteWorkflow;
        executeWorkflowStep: ExecuteWorkflowStep;
        scheduleWorkflow: ScheduleWorkflow;
        cancelWorkflowExecution: CancelWorkflowExecution;
        resumeWorkflowExecution: ResumeWorkflowExecution;
        isEventDrivenExecutionEnabled: () => boolean;
        isLogTriggerEventsEnabled: () => boolean;
    };
    stop(): void;
    private isEventDrivenExecutionEnabled;
    private isLogTriggerEventsEnabled;
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
