import type { ExitWhileNode, WorkflowGraph } from '@kbn/workflows/graph';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { StepIoService } from '../../workflow_context_manager/step_io_service';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger';
import type { NodeImplementation } from '../node_implementation';
export declare class ExitWhileNodeImpl implements NodeImplementation {
    private node;
    private stepExecutionRuntime;
    private wfExecutionRuntimeManager;
    private workflowLogger;
    private stepIoService;
    private workflowGraph;
    constructor(node: ExitWhileNode, stepExecutionRuntime: StepExecutionRuntime, wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager, workflowLogger: IWorkflowEventLogger, stepIoService: StepIoService, workflowGraph: WorkflowGraph);
    run(): void;
}
