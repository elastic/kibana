import type { KibanaRequest } from '@kbn/core/server';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';
import type { WorkflowTaskManager } from '../workflow_task_manager/workflow_task_manager';
/**
 * Persists `cancelRequested: true` and asks Task Manager to make the cancellation
 * take effect as soon as possible. `PENDING` is moved straight to `CANCELLED`
 * because no execution loop will ever observe the flag for it.
 *
 * `forceRunIdleTasks` either runs an idle task already scoped to this execution
 * or schedules an immediate resume task, so the execution loop wakes up, sees
 * `cancelRequested`, and finalises the cancel via `cancelWorkflowIfRequested`.
 *
 * Throws `WorkflowExecutionNotFoundError` when the execution does not exist in
 * the given space. Returns silently when it is already terminal.
 */
export declare const cancelWorkflow: ({ workflowExecutionId, spaceId, schedulingRequest, workflowExecutionRepository, workflowTaskManager, }: {
    workflowExecutionId: string;
    spaceId: string;
    schedulingRequest?: KibanaRequest;
    workflowExecutionRepository: WorkflowExecutionRepository;
    workflowTaskManager: WorkflowTaskManager;
}) => Promise<void>;
