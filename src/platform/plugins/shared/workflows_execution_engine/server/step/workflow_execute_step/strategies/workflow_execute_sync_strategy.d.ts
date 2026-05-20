import type { KibanaRequest } from '@kbn/core/server';
import type { EsWorkflow } from '@kbn/workflows';
import type { StepExecutionRepository } from '../../../repositories/step_execution_repository';
import type { WorkflowExecutionRepository } from '../../../repositories/workflow_execution_repository';
import type { WorkflowsExecutionEnginePluginStart } from '../../../types';
import type { StepExecutionRuntime } from '../../../workflow_context_manager/step_execution_runtime';
import type { IWorkflowEventLogger } from '../../../workflow_event_logger';
import type { StrategyResult } from '../types';
export type { StrategyResult } from '../types';
export declare class WorkflowExecuteSyncStrategy {
    private workflowsExecutionEngine;
    private workflowExecutionRepository;
    private stepExecutionRepository;
    private stepExecutionRuntime;
    private workflowLogger;
    constructor(workflowsExecutionEngine: WorkflowsExecutionEnginePluginStart, workflowExecutionRepository: WorkflowExecutionRepository, stepExecutionRepository: StepExecutionRepository, stepExecutionRuntime: StepExecutionRuntime, workflowLogger: IWorkflowEventLogger);
    execute(workflow: EsWorkflow, inputs: Record<string, unknown>, spaceId: string, request: KibanaRequest, parentDepth: number): Promise<StrategyResult>;
    /** True when wait state exists (e.g. after entering WAITING_FOR_CHILD). */
    canResume(): boolean;
    /** Child execution id when waiting on a sub-workflow (for onCancel). */
    getExecutionIdForCancel(): string | undefined;
    /** Re-read child execution from ES after child completion resumed the parent. */
    resume(spaceId: string): Promise<StrategyResult>;
    private initiateSubWorkflowExecution;
    private readChildExecutionFromEs;
    /**
     * Recursively extracts the output from a workflow execution's step executions.
     * At top-level (scopeDepth=0), finds the last step. At nested levels (scopeDepth>0),
     * considers all steps at that level. If steps have children, recurses into them.
     * Otherwise, returns their output(s).
     */
    private getWorkflowOutput;
    private getWorkflowOutputRecursive;
}
