import type { WorkflowGraph } from '@kbn/workflows/graph';
import type { NodeImplementation } from './node_implementation';
import type { ConnectorExecutor } from '../connector_executor';
import type { StepExecutionRuntime } from '../workflow_context_manager/step_execution_runtime';
import type { StepExecutionRuntimeFactory } from '../workflow_context_manager/step_execution_runtime_factory';
import type { StepIoService } from '../workflow_context_manager/step_io_service';
import type { ContextDependencies } from '../workflow_context_manager/types';
import type { WorkflowExecutionRuntimeManager } from '../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../workflow_event_logger';
export declare class NodesFactory {
    private connectorExecutor;
    private workflowRuntime;
    private workflowLogger;
    private workflowGraph;
    private stepExecutionRuntimeFactory;
    private dependencies;
    private stepIoService;
    constructor(connectorExecutor: ConnectorExecutor, // this is temporary, we will remove it when we have a proper connector executor
    workflowRuntime: WorkflowExecutionRuntimeManager, workflowLogger: IWorkflowEventLogger, // Assuming you have a logger interface
    workflowGraph: WorkflowGraph, stepExecutionRuntimeFactory: StepExecutionRuntimeFactory, dependencies: ContextDependencies, stepIoService: StepIoService);
    create(stepExecutionRuntime: StepExecutionRuntime): NodeImplementation;
    private createGenericStepNode;
}
