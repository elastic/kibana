import type { EsWorkflowStepExecution, WorkflowExecutionDto, WorkflowExecutionHistoryModel, WorkflowExecutionListDto } from '@kbn/workflows';
import type { ChildWorkflowExecutionItem } from '@kbn/workflows/types/v1';
import type { LogSearchResult } from '@kbn/workflows-execution-engine/server';
import type { ExecutionLogsParams, StepLogsParams } from '@kbn/workflows-execution-engine/server/workflow_event_logger/types';
import type { WorkflowExecutionQueryDeps } from './types';
import { type StepExecutionListResult } from '../api/lib/search_step_executions';
import type { GetStepExecutionParams, SearchStepExecutionsParams } from '../api/workflows_management_api';
import type { SearchWorkflowExecutionsParams } from '../api/workflows_management_service';
export declare class WorkflowExecutionQueryService {
    private readonly deps;
    constructor(deps: WorkflowExecutionQueryDeps);
    getWorkflowExecution(executionId: string, spaceId: string, options?: {
        includeInput?: boolean;
        includeOutput?: boolean;
    }): Promise<WorkflowExecutionDto | null>;
    getChildWorkflowExecutions(parentExecutionId: string, spaceId: string): Promise<ChildWorkflowExecutionItem[]>;
    getWorkflowExecutions(params: SearchWorkflowExecutionsParams, spaceId: string): Promise<WorkflowExecutionListDto>;
    getWorkflowExecutionHistory(executionId: string, spaceId: string): Promise<WorkflowExecutionHistoryModel[]>;
    getStepExecutions(params: GetStepExecutionParams, spaceId: string): Promise<EsWorkflowStepExecution[]>;
    searchStepExecutions(params: SearchStepExecutionsParams, spaceId: string): Promise<StepExecutionListResult>;
    getExecutionLogs(params: ExecutionLogsParams): Promise<LogSearchResult>;
    getStepLogs(params: StepLogsParams): Promise<LogSearchResult>;
    /**
     * Cross-workflow fan-out: returns every step execution currently blocked on
     * `waitForInput` in the given space. Used by the Inbox plugin to surface
     * pending HITL items across all workflows a user has access to.
     *
     * Intentionally minimal — the Inbox registry owns higher-level concerns
     * like status filtering and paginated merge-sort across providers.
     *
     * NOTE: only `spaceId` and `status` are filtered here because those are the
     * only keyword-indexed fields on `.workflows-step-executions`. An earlier
     * draft also added `term: { stepType: 'waitForInput' }`, which silently
     * matched zero docs and made the Inbox UI appear empty even when workflows
     * were paused on `waitForInput`. The status filter is sufficient because
     * `waiting_for_input` is only ever produced by the `waitForInput` step type.
     *
     * Defence-in-depth `must_not` on `finishedAt`: if a race between the
     * workflow-level timeout monitor and the waitForInput step leaves a doc with
     * `status: waiting_for_input` AND `finishedAt` set (the step is actually
     * settled), we must not resurface it in the Inbox — responding to it is a
     * no-op because the execution doc is terminal. The underlying race is fixed
     * in `WaitForInputStepImpl`, but this keeps the Inbox honest even for
     * pre-existing zombie docs or any future regression.
     *
     * Orphan filtering: `.workflows-step-executions` is NOT transactionally
     * cleaned up when a workflow is soft-deleted (see `workflow_deletion.ts`
     * — only hard-deletes call `deleteByQuery`). Without a join the Inbox
     * would surface ghost actions for workflows the user has already removed
     * from `/app/workflows`. We do this as a list-time filter rather than a
     * delete-time cancel so soft-deletes stay reversible (step executions
     * resurface if the workflow is restored) and so pre-existing orphans get
     * cleaned up retroactively.
     */
    listWaitingForInputSteps(spaceId: string, { page, perPage }?: {
        page?: number;
        perPage?: number;
    }): Promise<{
        results: EsWorkflowStepExecution[];
        total: number;
    }>;
    /**
     * Returns the subset of `ids` that point to alive workflows in `spaceId`
     * — i.e. exist in `.workflows-workflows` and are not soft-deleted
     * (`deleted_at` not set). Returns `null` if the lookup itself errored so
     * the caller can fall back to unfiltered behaviour.
     */
    private getAliveWorkflowIds;
    getStepExecution(params: GetStepExecutionParams, spaceId: string): Promise<EsWorkflowStepExecution | null>;
}
