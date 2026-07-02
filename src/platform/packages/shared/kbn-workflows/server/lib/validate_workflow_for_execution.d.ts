import type { WorkflowDetailDto } from '../..';
/**
 * Validates that a workflow is in a runnable state before execution.
 * Throws a descriptive error if any validation check fails.
 *
 * Uses TypeScript assertion signature so that after a successful call,
 * the compiler narrows `workflow` to a non-null `WorkflowDetailDto`
 * with a guaranteed `definition`.
 */
export declare function validateWorkflowForExecution(workflow: WorkflowDetailDto | null, workflowId: string): asserts workflow is WorkflowDetailDto & {
    definition: NonNullable<WorkflowDetailDto['definition']>;
};
