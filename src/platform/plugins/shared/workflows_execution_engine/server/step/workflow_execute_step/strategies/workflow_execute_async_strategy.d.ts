import type { KibanaRequest } from '@kbn/core/server';
import type { EsWorkflow } from '@kbn/workflows';
import type { WorkflowExecutionRepository } from '../../../repositories/workflow_execution_repository';
import type { WorkflowsExecutionEnginePluginStart } from '../../../types';
import type { StepExecutionRuntime } from '../../../workflow_context_manager/step_execution_runtime';
import type { IWorkflowEventLogger } from '../../../workflow_event_logger';
import type { StrategyResult } from '../types';
export declare class WorkflowExecuteAsyncStrategy {
    private workflowsExecutionEngine;
    private workflowExecutionRepository;
    private stepExecutionRuntime;
    private workflowLogger;
    constructor(workflowsExecutionEngine: WorkflowsExecutionEnginePluginStart, workflowExecutionRepository: WorkflowExecutionRepository, stepExecutionRuntime: StepExecutionRuntime, workflowLogger: IWorkflowEventLogger);
    execute(workflow: EsWorkflow, inputs: Record<string, unknown>, spaceId: string, request: KibanaRequest, parentDepth: number): Promise<StrategyResult>;
}
