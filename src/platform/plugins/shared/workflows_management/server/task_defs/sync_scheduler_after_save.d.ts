import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { EsWorkflow } from '@kbn/workflows';
import type { WorkflowTaskScheduler } from '../tasks/workflow_task_scheduler';
/**
 * Syncs scheduler state after a workflow document is saved (update path).
 * Re-reads the workflow from storage via `getWorkflow` so the scheduler is always
 * programmed against the last persisted state. Under concurrent writes this
 * guarantees the scheduler reflects the latest committed document, not an
 * in-memory copy that may have been superseded.
 */
export declare const syncSchedulerAfterSave: (params: {
    workflowId: string;
    spaceId: string;
    request: KibanaRequest;
    getWorkflow: (id: string, spaceId: string) => Promise<EsWorkflow | null>;
    taskScheduler: WorkflowTaskScheduler;
    logger: Logger;
}) => Promise<void>;
