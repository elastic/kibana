import type { Logger } from '@kbn/core/server';
import type { WorkflowTaskScheduler } from '../tasks/workflow_task_scheduler';
/**
 * Unschedules tasks for deleted or disabled workflows.
 * Shared by soft delete, hard delete, and disableAllWorkflows.
 */
export declare const unscheduleWorkflowTasks: (ids: string[], taskScheduler: WorkflowTaskScheduler | null, logger: Logger) => Promise<void>;
