import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { WorkflowExecutionListDto } from '@kbn/workflows';
import type { WorkflowStorage } from '../../storage/workflow_storage';
import type { WorkflowTaskScheduler } from '../../tasks/workflow_task_scheduler';
import type { DeleteWorkflowsResponse } from '../workflows_management_api';
import type { SearchWorkflowExecutionsParams } from '../workflows_management_service';
/**
 * Deletes workflows by IDs. Dispatches to soft or hard delete based on the `force` option.
 */
export declare const deleteWorkflows: (params: {
    ids: string[];
    spaceId: string;
    force: boolean;
    storage: WorkflowStorage;
    esClient: ElasticsearchClient;
    taskScheduler: WorkflowTaskScheduler | null;
    logger: Logger;
    getWorkflowExecutions: (p: SearchWorkflowExecutionsParams, sp: string) => Promise<WorkflowExecutionListDto>;
}) => Promise<DeleteWorkflowsResponse>;
