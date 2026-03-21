import type { KibanaRequest } from '@kbn/core/server';
import { type TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { EsWorkflowExecution } from '@kbn/workflows';
export declare class WorkflowTaskManager {
    private taskManager;
    constructor(taskManager: TaskManagerStartContract);
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
        fakeRequest: KibanaRequest;
    }): Promise<{
        taskId: string;
    }>;
    forceRunIdleTasks(workflowExecutionId: string): Promise<void>;
}
