import type { SerializedError } from '@kbn/workflows';
import type { ConnectorExecutor } from '../connector_executor';
import type { StepExecutionRuntime } from '../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../workflow_context_manager/workflow_execution_runtime_manager';
export interface RunStepResult {
    input: any;
    output: any;
    error: SerializedError | undefined;
}
export interface BaseStep {
    name: string;
    type: string;
    if?: string;
    foreach?: string;
    timeout?: number;
    'max-step-size'?: string;
    spaceId: string;
}
export type StepDefinition = BaseStep;
/**
 * Interface for node implementations within the workflow execution engine.
 * These implementations define the behavior of various workflow steps.
 */
export interface NodeImplementation {
    /**
     * Executes the node's logic.
     */
    run(): Promise<void> | void;
}
/**
 * Node implementation that can catch errors within its scope.
 * For example, retry steps or continue steps.
 */
export interface NodeWithErrorCatching {
    /**
     * Handles errors that occur within the node's execution context.
     * @param failedContext The context of the failed step execution.
     */
    catchError(failedContext: StepExecutionRuntime): Promise<void> | void;
}
/**
 * Node implementation monitoring its scope.
 * For example, timeout zones.
 * @param monitoredContext The context of the monitored step execution.
 */
export interface MonitorableNode {
    /**
     * Monitors the execution context of the node.
     * @param monitoredContext The context of the monitored step execution.
     */
    monitor(monitoredContext: StepExecutionRuntime): Promise<void> | void;
}
/**
 * Node implementation with explicit cancellation cleanup.
 *
 * Steps that hold external resources (child workflow executions, long-running
 * connections, etc.) implement this to perform teardown when cancelled.
 * `onCancel` is called after the abort signal fires and the step is marked
 * as cancelled — it fires in both the running and waiting states, giving
 * the step a guaranteed cleanup entry point without re-invoking `run()`.
 *
 * Implementations must be idempotent.
 */
export interface CancellableNode {
    onCancel(): Promise<void> | void;
}
export declare const isCancellableNode: (node: NodeImplementation) => node is NodeImplementation & CancellableNode;
export declare abstract class BaseAtomicNodeImplementation<TStep extends BaseStep> implements NodeImplementation {
    protected step: TStep;
    protected stepExecutionRuntime: StepExecutionRuntime;
    protected connectorExecutor: ConnectorExecutor | undefined;
    protected workflowExecutionRuntime: WorkflowExecutionRuntimeManager;
    constructor(step: TStep, stepExecutionRuntime: StepExecutionRuntime, connectorExecutor: ConnectorExecutor | undefined, workflowExecutionRuntime: WorkflowExecutionRuntimeManager);
    getName(): string;
    getInput(): any;
    run(): Promise<void>;
    protected abstract _run(input?: any): Promise<RunStepResult>;
    /**
     * Resolves the maximum step size in bytes.
     * Resolution order: step-level > workflow settings > plugin config > DEFAULT_MAX_STEP_SIZE.
     * Returns 0 if the configured value is explicitly "0" (disables the limit).
     * Returns the default on invalid/unparseable values to avoid crashing the step.
     */
    protected getMaxResponseBytes(): number;
    protected handleFailure(input: any, error: any): RunStepResult;
}
