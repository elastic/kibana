import type { ConcurrencySettings, WorkflowContext } from '@kbn/workflows';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';
import type { WorkflowTaskManager } from '../workflow_task_manager/workflow_task_manager';
/**
 * Manages concurrency control for workflow executions.
 *
 * Scope:
 * - Evaluating concurrency group keys from static strings or template expressions
 * - Enforcing concurrency limits per group
 * - Implementing collision strategies (drop, cancel-in-progress)
 */
export declare class ConcurrencyManager {
    private readonly templatingEngine;
    private readonly workflowTaskManager;
    private readonly workflowExecutionRepository;
    constructor(workflowTaskManager: WorkflowTaskManager, workflowExecutionRepository: WorkflowExecutionRepository);
    /**
     * Evaluates a concurrency key from workflow settings and execution context.
     *
     * @param concurrencySettings - The concurrency settings from workflow definition
     * @param context - The workflow execution context for template evaluation
     * @returns The evaluated concurrency group key, or null if key is not set/empty.
     *          If template evaluation fails or returns null/undefined, returns the key as-is
     *          (treating it as a static string, as the user may have intended literal text).
     */
    evaluateConcurrencyKey(concurrencySettings: ConcurrencySettings | undefined, context: WorkflowContext): string | null;
    /**
     * Checks concurrency limits and applies the collision strategy if needed.
     *
     * For 'cancel-in-progress' strategy:
     * - Queries for non-terminal executions with the same concurrency group key
     * - If limit is exceeded, cancels the oldest execution(s) to make room
     * - Returns true if the new execution can proceed, false otherwise
     *
     * For 'drop' strategy:
     * - Queries for non-terminal executions with the same concurrency group key
     * - If limit is exceeded, marks the new execution as SKIPPED and returns false
     * - Returns true if the new execution can proceed, false otherwise
     *
     * @param concurrencySettings - The concurrency settings from workflow definition
     * @param concurrencyGroupKey - The evaluated concurrency group key
     * @param currentExecutionId - The ID of the current execution to check
     * @param spaceId - The space ID of the execution
     * @returns Promise<boolean> - true if execution can proceed, false otherwise
     */
    checkConcurrency(concurrencySettings: ConcurrencySettings | undefined, concurrencyGroupKey: string | null, currentExecutionId: string, spaceId: string): Promise<boolean>;
}
