import type { CoreStart } from '@kbn/core/server';
import type { EsWorkflowExecution, StackFrame } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import type { GraphNodeUnion, WorkflowGraph } from '@kbn/workflows/graph';
import type { StepExecutionRuntimeFactory } from './step_execution_runtime_factory';
import type { StepIoService } from './step_io_service';
import type { ContextDependencies } from './types';
import type { WorkflowExecutionState } from './workflow_execution_state';
import type { ScopeData } from './workflow_scope_stack';
import type { WorkflowExecutionTelemetryClient } from '../lib/telemetry/workflow_execution_telemetry_client';
import type { IWorkflowEventLogger } from '../workflow_event_logger';
interface WorkflowExecutionRuntimeManagerInit {
    workflowExecutionState: WorkflowExecutionState;
    stepIoService: StepIoService;
    workflowExecution: EsWorkflowExecution;
    workflowExecutionGraph: WorkflowGraph;
    workflowLogger: IWorkflowEventLogger;
    coreStart?: CoreStart;
    dependencies?: ContextDependencies;
    telemetryClient?: WorkflowExecutionTelemetryClient;
}
/**
 * Manages the runtime execution state of a workflow, including step execution, results, and transitions.
 *
 * The `WorkflowExecutionRuntimeManager` class is responsible for orchestrating the execution of workflow steps,
 * tracking their statuses, results, and runtime states, and updating the overall workflow execution status.
 * It maintains the topological order of steps, supports step navigation, and interacts with repositories to persist
 * execution data.
 *
 * Key responsibilities:
 * - Tracks execution status, results, and runtime state for each workflow step.
 * - Navigates between steps according to topological order, skipping steps as needed.
 * - Initiates and finalizes step and workflow executions, updating persistent storage.
 * - Handles workflow completion and error propagation.
 * - Creates APM traces compatible with APM TraceWaterfall embeddable
 *
 * @remarks
 * This class assumes that workflow steps are represented as nodes in a directed acyclic graph (DAG),
 * and uses topological sorting to determine execution order.
 */
export declare class WorkflowExecutionRuntimeManager {
    private workflowLogger;
    private workflowExecutionState;
    private stepIoService;
    private entryTransactionId?;
    private workflowTransaction?;
    private workflowGraph;
    private nextNodeId;
    private coreStart?;
    private dependencies?;
    private telemetryClient?;
    private telemetryReported;
    private get topologicalOrder();
    constructor(workflowExecutionRuntimeManagerInit: WorkflowExecutionRuntimeManagerInit);
    get workflowExecution(): EsWorkflowExecution;
    /**
     * Get the APM trace ID for this workflow execution
     */
    getTraceId(): string;
    /**
     * Get the entry transaction ID (main workflow transaction)
     */
    getEntryTransactionId(): string | undefined;
    getWorkflowExecutionStatus(): ExecutionStatus;
    getWorkflowExecution(): EsWorkflowExecution;
    getCurrentNode(): GraphNodeUnion | null;
    navigateToNode(nodeId: string): void;
    navigateToNextNode(): void;
    navigateToAfterNode(nodeId: string): void;
    private nodeAfter;
    getCurrentNodeScope(): StackFrame[];
    /**
     * Enters a new scope in the workflow execution context.
     *
     * This method creates a new scope frame and pushes it onto the scope stack, establishing
     * a new execution context for nested workflow operations. Scopes are used to track
     * hierarchical execution contexts such as loops, conditionals, or sub-workflows.
     *
     * @param subScopeId - Optional identifier for the sub-scope being entered
     *
     * @remarks
     * This method includes a guard condition that prevents scope entry if the current node
     * is not an appropriate "enter" node. The scope update will be silently ignored if:
     * - The current node type does not start with 'enter' (e.g., 'enter-foreach', 'enter-if', etc)
     *
     * This guard ensures that scopes are only created at the correct workflow execution points,
     * maintaining the integrity of the execution context hierarchy.
     */
    enterScope(subScopeId?: string): void;
    /**
     * Exits the current scope in the workflow execution context.
     *
     * This method pops the top scope frame from the scope stack, returning to the previous
     * execution context. This is typically called when leaving nested workflow operations
     * such as loops, conditionals, or sub-workflows.
     *
     * @remarks
     * This method includes multiple guard conditions that prevent scope exit if the current
     * execution state is not appropriate. The scope update will be silently ignored if:
     * - The current node type does not start with 'exit' (e.g., 'exit-foreach', 'exit-if', etc)
     * - The current node's corresponding enter type doesn't match the current scope's node type
     *   (e.g., trying to exit a loop scope from a conditional exit node)
     *
     * These guards ensure that scopes are only exited at the correct workflow execution points
     * and maintain proper nesting hierarchy, preventing scope stack corruption and ensuring
     * the integrity of the execution context.
     */
    exitScope(): void;
    setWorkflowOutputs(outputs: Record<string, unknown>): void;
    setWorkflowStatus(status: ExecutionStatus): void;
    /**
     * Sets workflow status to CANCELLED with a reason (and cancelledAt, cancelledBy).
     * Use when workflow.output has status: 'cancelled' or when cancelling with a specific message.
     */
    setWorkflowCancelled(reason: string): void;
    /**
     * Pops scopes from the scope stack, finishing each one, until {@link shouldStop}
     * returns true for the current scope (or the stack is exhausted when no predicate
     * is provided).
     *
     * @param inclusive — when true the scope that matches {@link shouldStop} is also
     *   popped and finished. Defaults to false (stop *before* the matching scope).
     *
     * Used by:
     * - loop.break — stop at and *include* the enclosing loop enter node (inclusive)
     * - loop.continue — stop *before* the enclosing loop enter node (exclusive)
     * - workflow.output / workflow.fail — unwind the entire stack (no predicate)
     */
    unwindScopes(stepExecutionRuntimeFactory: StepExecutionRuntimeFactory, shouldStop?: (scope: ScopeData) => boolean, { inclusive }?: {
        inclusive?: boolean;
    }): void;
    setWorkflowError(error: Error | undefined): void;
    markWorkflowTimeouted(): void;
    start(): Promise<void>;
    resume(): Promise<void>;
    saveState(): Promise<void>;
    private logWorkflowStart;
    private logWorkflowComplete;
    /**
     * Reports telemetry for workflow execution when it reaches a terminal status.
     * Only reports once per execution to avoid duplicate events.
     */
    private reportTelemetryIfTerminal;
}
export {};
