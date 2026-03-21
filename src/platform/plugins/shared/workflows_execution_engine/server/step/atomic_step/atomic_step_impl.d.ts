import type { AtomicGraphNode } from '@kbn/workflows/graph';
import type { ConnectorExecutor } from '../../connector_executor';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger';
import type { NodeImplementation } from '../node_implementation';
/**
 * Implements the execution logic for an atomic workflow step.
 *
 * `AtomicStepImpl` is responsible for running a single atomic step within a workflow.
 * It delegates the execution to a `ConnectorStepImpl`, passing the necessary configuration,
 * context manager, connector executor, and workflow state.
 *
 * @remarks
 * This class is typically used internally by the workflow execution engine to process
 * atomic nodes in the workflow graph.
 *
 * @param node - The atomic graph node containing step configuration.
 * @param contextManager - Manages workflow context and state.
 * @param connectorExecutor - Executes connector operations for the step.
 * @param workflowState - Manages the runtime state of workflow execution.
 */
export declare class AtomicStepImpl implements NodeImplementation {
    private node;
    private stepExecutionRuntime;
    private connectorExecutor;
    private workflowState;
    private workflowLogger;
    constructor(node: AtomicGraphNode, stepExecutionRuntime: StepExecutionRuntime, connectorExecutor: ConnectorExecutor, workflowState: WorkflowExecutionRuntimeManager, workflowLogger: IWorkflowEventLogger);
    run(): Promise<void>;
}
