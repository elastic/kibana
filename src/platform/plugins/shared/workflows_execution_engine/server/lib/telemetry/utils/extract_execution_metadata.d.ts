import type { EsWorkflowExecution, EsWorkflowStepExecution } from '@kbn/workflows';
/**
 * Metadata extracted from a workflow execution for telemetry purposes
 */
export interface WorkflowExecutionTelemetryMetadata {
    /**
     * Number of steps that were executed
     */
    executedStepCount: number;
    /**
     * Number of steps that completed successfully
     */
    successfulStepCount: number;
    /**
     * Number of steps that failed
     */
    failedStepCount: number;
    /**
     * Number of steps that were skipped
     */
    skippedStepCount: number;
    /**
     * Array of connector types that were actually used in execution
     */
    executedConnectorTypes: string[];
    /**
     * Maximum execution depth (nested scopes)
     */
    maxExecutionDepth: number;
    /**
     * Whether any steps were retried
     */
    hasRetries: boolean;
    /**
     * Whether any steps used on-failure handlers (fallback, continue)
     */
    hasErrorHandling: boolean;
    /**
     * Number of unique step IDs that were executed (accounts for loops/retries)
     */
    uniqueStepIdsExecuted: number;
    /**
     * Alert rule ID if triggered by alert
     */
    ruleId?: string;
    /**
     * Time to first step in milliseconds
     */
    timeToFirstStep?: number;
    /**
     * Queue delay in milliseconds
     */
    queueDelayMs?: number;
    /**
     * Whether the workflow execution timed out
     */
    timedOut: boolean;
    /**
     * Configured timeout in milliseconds
     */
    timeoutMs?: number;
    /**
     * How much the timeout was exceeded by in milliseconds
     */
    timeoutExceededByMs?: number;
    /**
     * Array of step durations with step identification
     * Each entry contains stepId, stepType, and duration in milliseconds
     */
    stepDurations?: Array<{
        stepId: string;
        stepType?: string;
        duration: number;
    }>;
    /**
     * Average duration per step type (dictionary with sanitized step type as key).
     * Step types with dots are sanitized (dots replaced with underscores) for proper ES field indexing.
     * E.g., { "if": 100, "console": 40, "elasticsearch_search": 250 }
     */
    stepAvgDurationsByType?: Record<string, number>;
}
/**
 * Extracts telemetry metadata from a workflow execution and its step executions.
 * This includes execution statistics, alert rule ID, queue delay, time to first step, and timeout information.
 *
 * @param workflowExecution - The workflow execution
 * @param stepExecutions - Array of step executions for this workflow execution
 * @returns Metadata object with extracted execution information
 */
export declare function extractExecutionMetadata(workflowExecution: EsWorkflowExecution, stepExecutions: EsWorkflowStepExecution[]): WorkflowExecutionTelemetryMetadata;
/**
 * Extracts the alert rule ID from workflow execution context.
 * Returns undefined if not triggered by alert or rule ID not available.
 *
 * @param workflowExecution - The workflow execution
 * @returns The alert rule ID if available, undefined otherwise
 */
export declare function extractAlertRuleId(workflowExecution: EsWorkflowExecution): string | undefined;
/**
 * Calculates the time to first step (TTFS) in milliseconds.
 * This is the time from when the workflow execution started to when the first step execution started.
 *
 * @param workflowExecution - The workflow execution
 * @param stepExecutions - Array of step executions for this workflow execution
 * @returns Time to first step in milliseconds, or undefined if no steps were executed or timestamps are missing
 */
export declare function extractTimeToFirstStep(workflowExecution: EsWorkflowExecution, stepExecutions: EsWorkflowStepExecution[]): number | undefined;
/**
 * Extracts or calculates queue delay in milliseconds from workflow execution.
 * Queue delay is the time from when a workflow was scheduled/queued to when it started executing.
 *
 * Priority:
 * 1. Use queueMetrics.queueDelayMs if available (most accurate, includes concurrency queue delays)
 * 2. For scheduled workflows, calculate from taskRunAt and startedAt if available
 * 3. Return undefined if insufficient data
 *
 * @param workflowExecution - The workflow execution
 * @returns Queue delay in milliseconds, or undefined if not available or not applicable
 */
export declare function extractQueueDelayMs(workflowExecution: EsWorkflowExecution): number | undefined;
