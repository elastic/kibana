import type { Logger } from '@kbn/core/server';
import type { WorkflowStorage } from '../../storage/workflow_storage';
import type { WorkflowTaskScheduler } from '../../tasks/workflow_task_scheduler';
/**
 * Disables all enabled workflows. When `spaceId` is set, scopes the operation
 * to that space; otherwise operates across all spaces. Sets `enabled: false`,
 * patches YAML accordingly, and unschedules any scheduled tasks.
 * Used when a user opts out of workflows by toggling the per-space UI setting off,
 * or when availability (license / config) requires a global bulk disable.
 */
export declare const disableAllWorkflows: (params: {
    storage: WorkflowStorage;
    taskScheduler: WorkflowTaskScheduler | null;
    logger: Logger;
    spaceId?: string;
}) => Promise<{
    total: number;
    disabled: number;
    failures: Array<{
        id: string;
        error: string;
    }>;
}>;
