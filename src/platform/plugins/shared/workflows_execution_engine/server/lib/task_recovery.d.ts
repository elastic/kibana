import type { Logger } from '@kbn/core/server';
import type { EsWorkflowExecution } from '@kbn/workflows';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';
/** Unified error type for executions abandoned after Kibana/Task Manager interruption (fail-fast recovery). */
export declare const TASK_RECOVERY_ERROR_TYPE: "TaskRecoveryError";
export declare const taskRecoveryMessages: {
    readonly scheduledStale: "Execution abandoned due to recovery mechanism. The scheduled task was interrupted before completion.";
    readonly workflowRunInterrupted: "Execution abandoned due to recovery mechanism. The workflow run task was interrupted before completion.";
    readonly workflowResumeInterrupted: "Execution abandoned due to recovery mechanism. The workflow resume task was interrupted before completion.";
};
export declare function buildTaskAttemptsExhaustedMessage(lastError: string): string;
export type InterruptedWorkflowRunTaskOutcome = 'run_workflow' | 'task_complete';
/**
 * When Task Manager retries `workflow:run` (`attempts > 1`), the prior claim did not finish successfully.
 * Fail the persisted execution (same fault-tolerance model as scheduled stale recovery) so operators
 * see a terminal FAILED state instead of a stuck RUNNING execution. `waiting_for_input` is excluded
 * because resumption is human-driven via the resume API.
 */
export declare function resolveInterruptedWorkflowRunTask({ workflowExecutionRepository, workflowRunId, spaceId, taskAttempts, logger, }: {
    workflowExecutionRepository: WorkflowExecutionRepository;
    workflowRunId: string;
    spaceId: string;
    taskAttempts: number;
    logger: Logger;
}): Promise<InterruptedWorkflowRunTaskOutcome>;
export type InterruptedWorkflowResumeTaskOutcome = 'resume_workflow' | 'task_complete';
/**
 * When Task Manager retries `workflow:resume` (`attempts > 1`), the prior claim did not finish successfully.
 * Fail non-terminal executions that are no longer waiting for input (stuck RUNNING / WAITING, etc.).
 * If still `waiting_for_input`, invoke the resume handler again - the first attempt never completed.
 */
export declare function resolveInterruptedWorkflowResumeTask({ workflowExecutionRepository, workflowRunId, spaceId, taskAttempts, logger, }: {
    workflowExecutionRepository: WorkflowExecutionRepository;
    workflowRunId: string;
    spaceId: string;
    taskAttempts: number;
    logger: Logger;
}): Promise<InterruptedWorkflowResumeTaskOutcome>;
export declare function markExecutionFailedTaskRecovery(workflowExecutionRepository: WorkflowExecutionRepository, executionId: string, { message, type, }: {
    message: string;
    type?: typeof TASK_RECOVERY_ERROR_TYPE | 'TaskAttemptsExhaustedError';
}): Promise<void>;
/**
 * After **`workflow:run`** or **`workflow:resume`** throws on the **last** Task Manager attempt
 * (`taskAttempts >= maxAttempts` from the caller), best-effort mark a still-non-terminal execution
 * **`FAILED`** with **`TaskAttemptsExhaustedError`** so it does not stay stuck if the handler exits
 * without updating state. Same semantics for both task types; **`plugin.ts`** passes the task's
 * **`maxAttempts`** (`WORKFLOW_RUN_TASK_MAX_ATTEMPTS` vs **`WORKFLOW_RESUME_TASK_MAX_ATTEMPTS`**).
 */
export declare function resolveExhaustedWorkflowRunTask({ workflowExecutionRepository, workflowRunId, spaceId, taskAttempts, maxAttempts, error, logger, }: {
    workflowExecutionRepository: WorkflowExecutionRepository;
    workflowRunId: string;
    spaceId: string;
    taskAttempts: number;
    maxAttempts: number;
    error: unknown;
    logger: Logger;
}): Promise<void>;
/** For `workflow:run` retry path after `taskAttempts > 1` with a loaded execution; exported for tests. */
export declare function shouldFailOnWorkflowRunRetry(execution: EsWorkflowExecution): boolean;
