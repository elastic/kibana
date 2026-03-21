import type { AtomicGraphNode } from '@kbn/workflows/graph';
import type { ServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { BaseStep, RunStepResult } from './node_implementation';
import { BaseAtomicNodeImplementation } from './node_implementation';
import type { ConnectorExecutor } from '../connector_executor';
import type { StepExecutionRuntime } from '../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../workflow_event_logger';
/**
 * Implementation for custom registered step types.
 *
 * This class executes custom step types registered via the registerStepType API.
 * It validates input against the step's schema, executes the handler function,
 * and validates the output.
 *
 * When the step definition provides an `onCancel` handler, instances expose
 * the `CancellableNode.onCancel` method so the execution engine can invoke
 * cleanup on cancellation.
 */
export declare class CustomStepImpl extends BaseAtomicNodeImplementation<BaseStep> {
    private node;
    private stepDefinition;
    private workflowLogger;
    constructor(node: AtomicGraphNode, stepDefinition: ServerStepDefinition, stepExecutionRuntime: StepExecutionRuntime, connectorExecutor: ConnectorExecutor, workflowExecutionRuntime: WorkflowExecutionRuntimeManager, workflowLogger: IWorkflowEventLogger);
    /**
     * Get and validate the input for this step
     */
    getInput(): unknown;
    /**
     * Execute the custom step handler
     */
    protected _run(input: unknown): Promise<RunStepResult>;
    /**
     * Create the handler context shared by both handler and onCancel.
     */
    private createHandlerContext;
}
