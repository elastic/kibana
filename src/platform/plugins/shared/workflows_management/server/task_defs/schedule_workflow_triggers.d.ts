import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { WorkflowYaml } from '@kbn/workflows';
import type { WorkflowTaskScheduler } from '../tasks/workflow_task_scheduler';
/**
 * Schedules trigger tasks for a newly created workflow.
 * Used by both createWorkflow and bulkCreateWorkflows.
 */
export declare const scheduleWorkflowTriggers: (params: {
    workflowId: string;
    definition: WorkflowYaml | undefined;
    spaceId: string;
    request: KibanaRequest;
    taskScheduler: WorkflowTaskScheduler | null;
    logger: Logger;
}) => Promise<void>;
