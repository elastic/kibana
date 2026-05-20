import type { WorkflowAggsDto, WorkflowDetailDto, WorkflowListDto, WorkflowStatsDto } from '@kbn/workflows';
import type { WorkflowSearchDeps } from './types';
import type { GetWorkflowsParams } from '../api/workflows_management_api';
export declare class WorkflowSearchService {
    private readonly deps;
    constructor(deps: WorkflowSearchDeps);
    getWorkflowsSubscribedToTrigger(triggerId: string, spaceId: string): Promise<WorkflowDetailDto[]>;
    getWorkflows(params: GetWorkflowsParams, spaceId: string, options?: {
        includeExecutionHistory?: boolean;
    }): Promise<WorkflowListDto>;
    getWorkflowStats(spaceId: string, options?: {
        includeExecutionStats?: boolean;
    }): Promise<WorkflowStatsDto>;
    getWorkflowAggs(fields: string[], spaceId: string): Promise<WorkflowAggsDto>;
    private getExecutionHistoryStats;
    private getRecentExecutionsForWorkflows;
}
