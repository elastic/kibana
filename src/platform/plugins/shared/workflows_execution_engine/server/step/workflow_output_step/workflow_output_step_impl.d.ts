import type { WorkflowOutputGraphNode } from '@kbn/workflows/graph';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { StepExecutionRuntimeFactory } from '../../workflow_context_manager/step_execution_runtime_factory';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger';
import type { NodeImplementation } from '../node_implementation';
/**
 * Implements the workflow.output step which emits outputs and terminates workflow execution.
 *
 * When this step executes:
 * 1. Validates the output values against the workflow's declared output schema (if any)
 * 2. Sets the workflow outputs in the execution context
 * 3. Terminates the workflow with the specified status (completed/cancelled/failed)
 * 4. Prevents any subsequent steps from executing by clearing the next node
 */
export declare class WorkflowOutputStepImpl implements NodeImplementation {
    private node;
    private stepExecutionRuntime;
    private workflowExecutionRuntime;
    private workflowLogger;
    private stepExecutionRuntimeFactory;
    constructor(node: WorkflowOutputGraphNode, stepExecutionRuntime: StepExecutionRuntime, workflowExecutionRuntime: WorkflowExecutionRuntimeManager, workflowLogger: IWorkflowEventLogger, stepExecutionRuntimeFactory: StepExecutionRuntimeFactory);
    /**
     * Completes all ancestor steps in the scope stack.
     * Uses the step's own finishStep() logic so lifecycle behaviour
     * (logging, timing, status) is applied consistently.
     */
    private completeAncestorSteps;
    run(): Promise<void>;
}
