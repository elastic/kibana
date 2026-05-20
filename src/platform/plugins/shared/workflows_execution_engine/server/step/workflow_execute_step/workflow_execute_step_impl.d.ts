import type { KibanaRequest } from '@kbn/core/server';
import type { WorkflowRepository } from '@kbn/workflows';
import type { WorkflowExecuteAsyncGraphNode, WorkflowExecuteGraphNode } from '@kbn/workflows/graph';
import type { WorkflowsExecutionEngineConfig } from '../../config';
import type { StepExecutionRepository } from '../../repositories/step_execution_repository';
import type { WorkflowExecutionRepository } from '../../repositories/workflow_execution_repository';
import type { WorkflowsExecutionEnginePluginStart } from '../../types';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger';
import type { CancellableNode, NodeImplementation } from '../node_implementation';
export interface WorkflowExecuteStepImplInit {
    node: WorkflowExecuteGraphNode | WorkflowExecuteAsyncGraphNode;
    stepExecutionRuntime: StepExecutionRuntime;
    workflowExecutionRuntime: WorkflowExecutionRuntimeManager;
    workflowRepository: WorkflowRepository;
    spaceId: string;
    request: KibanaRequest;
    workflowsExecutionEngine: WorkflowsExecutionEnginePluginStart;
    workflowExecutionRepository: WorkflowExecutionRepository;
    stepExecutionRepository: StepExecutionRepository;
    workflowLogger: IWorkflowEventLogger;
    config: WorkflowsExecutionEngineConfig;
}
export declare class WorkflowExecuteStepImpl implements NodeImplementation, CancellableNode {
    private readonly init;
    private syncExecutor;
    private asyncExecutor;
    constructor(init: WorkflowExecuteStepImplInit);
    private getInput;
    private assertValidWorkflowId;
    /**
     * Applies strategy result to step and workflow runtime (completed/failed → finish or fail step
     * and navigate; waiting/cancelled → no navigation).
     */
    private handleResult;
    run(): Promise<void>;
    onCancel(): Promise<void>;
    private getWorkflow;
    private isManagedParentExecution;
    private ensureWorkflowIsExecutable;
}
