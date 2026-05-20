import type { WorkflowYaml } from '@kbn/workflows/spec/schema';
/**
 * Metadata extracted from a workflow definition for telemetry purposes
 */
export interface WorkflowTelemetryMetadata {
    /**
     * Whether the workflow is enabled
     */
    enabled: boolean;
    /**
     * Total number of steps in the workflow (including nested steps)
     */
    stepCount: number;
    /**
     * Unique connector types used in the workflow
     */
    connectorTypes: string[];
    /**
     * Count of steps by step type (e.g., { 'foreach': 2, 'slack.webhook': 5, 'if': 1 })
     */
    stepTypeCounts: Record<string, number>;
    /**
     * Whether the workflow has scheduled triggers
     */
    hasScheduledTriggers: boolean;
    /**
     * Whether the workflow has alert triggers
     */
    hasAlertTriggers: boolean;
    /**
     * Number of inputs defined in the workflow
     */
    inputCount: number;
    /**
     * Number of triggers defined in the workflow
     */
    triggerCount: number;
    /**
     * Whether the workflow has a timeout configured
     */
    hasTimeout: boolean;
    /**
     * Whether the workflow has concurrency settings configured
     */
    hasConcurrency: boolean;
    /**
     * Maximum concurrent runs if concurrency is configured
     */
    concurrencyMax?: number;
    /**
     * Concurrency strategy if concurrency is configured ('queue', 'drop', or 'cancel-in-progress')
     */
    concurrencyStrategy?: string;
    /**
     * Whether the workflow has on-failure handling configured
     */
    hasOnFailure: boolean;
}
/**
 * Extracts telemetry metadata from a workflow definition.
 * This is a server-side version that works directly with WorkflowYaml objects.
 *
 * @param workflow - The workflow definition (can be partial)
 * @returns Metadata object with extracted information
 */
export declare function extractWorkflowMetadata(workflow: Partial<WorkflowYaml> | null | undefined): WorkflowTelemetryMetadata;
