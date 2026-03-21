import type { AnalyticsServiceSetup, AnalyticsServiceStart, Logger } from '@kbn/core/server';
import type { EsWorkflowExecution, EsWorkflowStepExecution } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import { type WorkflowExecutionTelemetryEventsMap, WorkflowExecutionTelemetryEventTypes } from './events/workflows_execution/types';
/**
 * Base telemetry client for workflow execution engine.
 * Provides common functionality for reporting telemetry events.
 */
export declare class WorkflowExecutionTelemetryClient {
    protected readonly telemetry: AnalyticsServiceStart;
    protected readonly logger: Logger;
    /**
     * Registers telemetry event schemas during plugin setup.
     * This should be called once during the plugin's setup phase.
     */
    static setup(analytics: AnalyticsServiceSetup): void;
    constructor(telemetry: AnalyticsServiceStart, logger: Logger);
    /**
     * Reports a telemetry event with error handling.
     */
    protected reportEvent<T extends WorkflowExecutionTelemetryEventTypes>(eventType: T, data: WorkflowExecutionTelemetryEventsMap[T]): void;
    /**
     * Reports a workflow execution termination event.
     * This is a centralized method that routes to the appropriate specific event based on the final status.
     *
     * @param params - Parameters containing workflow execution, step executions, and final status
     */
    reportWorkflowExecutionTerminated(params: {
        workflowExecution: EsWorkflowExecution;
        stepExecutions: EsWorkflowStepExecution[];
        finalStatus: ExecutionStatus;
    }): void;
    /**
     * Reports when a workflow execution completes successfully.
     * Note: We only report completion/failure/cancellation events (not started) to reduce telemetry load.
     */
    reportWorkflowExecutionCompleted(params: {
        workflowExecution: EsWorkflowExecution;
        stepExecutions: EsWorkflowStepExecution[];
    }): void;
    /**
     * Reports when a workflow execution fails.
     */
    reportWorkflowExecutionFailed(params: {
        workflowExecution: EsWorkflowExecution;
        stepExecutions: EsWorkflowStepExecution[];
    }): void;
    /**
     * Reports when a workflow execution is cancelled.
     */
    reportWorkflowExecutionCancelled(params: {
        workflowExecution: EsWorkflowExecution;
        stepExecutions: EsWorkflowStepExecution[];
    }): void;
}
