import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { Logger } from '@kbn/core/server';
import type { UsageReportingService } from '@kbn/usage-api-plugin/server';
import type { EsWorkflowExecution } from '@kbn/workflows';
/**
 * Workflows Metering Service - Stage 1 of the billing pipeline.
 *
 * Builds UsageRecords from completed workflow executions and sends them
 * to the Usage API. Uses event-based metering: reports immediately after
 * each workflow reaches a terminal state (fire-and-forget with inline retry).
 *
 * Key design decisions:
 * - quantity=1 for each execution (simple count). Transform function decides billing.
 * - Rich metadata (duration, status, step_types, etc.) for flexible pricing logic.
 * - Deduplication via deterministic ID: `workflow-execution-{executionId}`.
 * - Supports both Serverless (projectId) and ECH (deploymentId).
 */
export declare class WorkflowsMeteringService {
    private readonly usageReportingService;
    private readonly logger;
    constructor(usageReportingService: UsageReportingService, logger: Logger);
    /**
     * Reports a workflow execution to the Usage API.
     *
     * Callers should NOT await this -- it is designed to be fire-and-forget.
     * All errors are caught and logged internally. Returning a Promise enables
     * tests to await completion without needing fake timers.
     */
    reportWorkflowExecution(execution: EsWorkflowExecution, cloudSetup?: CloudSetup): Promise<void>;
    /**
     * Builds a UsageRecord from a completed workflow execution.
     *
     * The record follows Usage Record Schema v2. Kibana (Stage 1) sends raw data;
     * the transform function (Stage 3) decides what's billable and how to price it.
     */
    private buildUsageRecord;
    /**
     * Extracts a breakdown of step types from the workflow definition.
     * Returns a map of step type -> count (e.g., { connector: 5, transform: 3, ai: 2 }).
     */
    private extractStepTypes;
}
