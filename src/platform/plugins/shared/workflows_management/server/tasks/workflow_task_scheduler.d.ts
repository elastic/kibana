import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { EsWorkflow } from '@kbn/workflows';
import type { WorkflowTrigger } from '../lib/schedule_utils';
export interface WorkflowTaskSchedulerParams {
    workflowId: string;
    spaceId: string;
    schedule: {
        interval: string;
    };
}
export declare class WorkflowTaskScheduler {
    private readonly logger;
    private readonly taskManager;
    constructor(logger: Logger, taskManager: TaskManagerStartContract);
    /**
     * Schedules tasks for all scheduled triggers in a workflow.
     * Uses idempotent scheduling: if a task already exists, its schedule is updated in place.
     */
    scheduleWorkflowTasks(workflow: EsWorkflow, spaceId: string, request: KibanaRequest): Promise<string[]>;
    /**
     * Schedules a single workflow task for a specific trigger.
     * Idempotent: if the task already exists (409 conflict), updates the schedule in place
     * via bulkUpdateSchedules instead of failing. This handles both interval and RRule schedules.
     */
    scheduleWorkflowTask(workflowId: string, spaceId: string, trigger: WorkflowTrigger, request: KibanaRequest): Promise<string>;
    /**
     * Unschedules all tasks for a workflow
     */
    unscheduleWorkflowTasks(workflowId: string): Promise<void>;
    /**
     * Updates scheduled tasks when a workflow is updated.
     * Uses idempotent scheduling (create-or-update) instead of a non-atomic delete-then-create
     * pattern. This prevents the task from being permanently lost if the create step fails
     * after the delete step succeeds.
     */
    updateWorkflowTasks(workflow: EsWorkflow, spaceId: string, request: KibanaRequest): Promise<void>;
}
