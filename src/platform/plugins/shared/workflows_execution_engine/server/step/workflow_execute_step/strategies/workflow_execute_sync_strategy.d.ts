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
    /**
     * Returns true when the step has persisted wait state (e.g. after entering delay
     * to poll). Used by the step impl to decide resume vs full run without coupling
     * to node type or state shape.
     */
    canResume(): boolean;
    /**
     * Returns the child execution id if this step is in a state that can be cancelled
     * (waiting on sub-workflow). Used by the step impl for onCancel without knowing
     * the strategy's state shape.
     */
    getExecutionIdForCancel(): string | undefined;
    /**
     * Resume a sync workflow.execute step (poll iteration). Call only when the step
     * already has wait state (e.g. after delay). Skips all initiation work; only
     * checks sub-workflow status and updates wait state or completes.
     */
    resume(spaceId: string): Promise<StrategyResult>;
    private initiateSubWorkflowExecution;
    private checkSubWorkflowStatus;
    /**
     * Recursively extracts the output from a workflow execution's step executions.
     * At top-level (scopeDepth=0), finds the last step. At nested levels (scopeDepth>0),
     * considers all steps at that level. If steps have children, recurses into them.
     * Otherwise, returns their output(s).
     */
    private getWorkflowOutput;
    private getWorkflowOutputRecursive;
}
