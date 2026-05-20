import { type KibanaRequest } from '@kbn/core/server';
import { type TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { EsWorkflowExecution } from '@kbn/workflows';
/** Stable task id so idle-timeout (workflow + enclosing step) resumes dedupe per execution. */
export declare const getWorkflowGlobalTimeoutResumeTaskId: (workflowExecutionId: string) => string;
export declare class WorkflowTaskManager {
    private taskManager;
    constructor(taskManager: TaskManagerStartContract);
    /**
     * Schedules or updates a single `workflow:resume` at the earliest idle deadline (HITL /
     * sync child). Skips TM writes when runAt and params already match.
     *
     * Uses `taskManager.get` once per schedule attempt to dedupe: callers invoke this when
     * entering `handleExecutionDelay` after a step completes (once per `runNode` pass while the
     * workflow is waiting), not in an inner hot loop over unchanged state.
     */
    scheduleWorkflowGlobalTimeoutResumeTask({ workflowExecution, resumeAt, fakeRequest, }: {
        workflowExecution: EsWorkflowExecution;
        resumeAt: Date;
        fakeRequest: KibanaRequest;
    }): Promise<{
        taskId: string;
    }>;
    scheduleResumeTask({ workflowExecution, resumeAt, fakeRequest, }: {
        workflowExecution: EsWorkflowExecution;
        resumeAt: Date;
        fakeRequest: KibanaRequest;
    }): Promise<{
        taskId: string;
    }>;
    scheduleImmediateResume({ executionId, spaceId, fakeRequest, }: {
        executionId: string;
        spaceId: string;
        fakeRequest?: KibanaRequest;
    }): Promise<{
        taskId: string;
    }>;
    forceRunIdleTasks(workflowExecutionId: string, options?: {
        spaceId: string;
        fakeRequest?: KibanaRequest;
    }): Promise<void>;
}
