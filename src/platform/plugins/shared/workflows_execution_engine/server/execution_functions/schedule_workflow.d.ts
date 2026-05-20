import type { Logger } from '@kbn/core/server';
import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import type { WorkflowExecutionEngineModel } from '@kbn/workflows';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';
/**
 * Checks if there's an existing non-terminal scheduled execution for a workflow.
 *
 * We use the task's `runAt` to link executions to specific scheduled runs:
 * - `runAt` represents the scheduled time for this specific run of a recurring task
 * - Each scheduled run has a unique `runAt` value (calculated from the previous run's completion)
 * - `runAt` is only updated AFTER a task completes successfully (or fails with retry)
 * - If a task is interrupted/recovered BEFORE completion, `runAt` stays the same
 *
 * Logic:
 * - If execution's `taskRunAt` matches current task's `runAt` AND `attempts > 1`:
 *   → Execution was created for THIS scheduled run but is still PENDING/RUNNING
 *   → `attempts > 1` means this is a retry/recovery (not the first attempt)
 *   → The execution is stale from a previous attempt and will never complete
 *   → If `waiting_for_input`, skip this tick only (human resume; do not fail the execution)
 *   → Else mark execution as FAILED (TaskRecoveryError) and proceed with a new execution for this tick
 *
 * - If execution's `taskRunAt` differs from current task's `runAt`:
 *   → Execution is from a DIFFERENT scheduled run that's still running
 *   → This is a legitimate concurrent execution (previous scheduled run hasn't finished yet)
 *   → Skip current run (create SKIPPED execution)
 *
 * Note: Retries of the same scheduled run will have the same `runAt` but different `startedAt`.
 * This is why we use `runAt` instead of `startedAt` for comparison.
 * We also check `attempts > 1` to ensure we only mark executions as stale when they're from a previous attempt.
 */
export declare function checkAndSkipIfExistingScheduledExecution(workflow: WorkflowExecutionEngineModel, spaceId: string, workflowExecutionRepository: WorkflowExecutionRepository, currentTaskInstance: ConcreteTaskInstance, logger: Logger): Promise<boolean>;
