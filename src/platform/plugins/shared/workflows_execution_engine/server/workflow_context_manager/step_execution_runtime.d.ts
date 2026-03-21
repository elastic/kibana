import type { EsWorkflowExecution, EsWorkflowStepExecution, StackFrame } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import type { GraphNodeUnion, WorkflowGraph } from '@kbn/workflows/graph';
import type { WorkflowContextManager } from './workflow_context_manager';
import type { WorkflowExecutionState } from './workflow_execution_state';
import { WorkflowScopeStack } from './workflow_scope_stack';
import type { RunStepResult } from '../step/node_implementation';
import type { IWorkflowEventLogger } from '../workflow_event_logger';
interface StepExecutionRuntimeInit {
    contextManager: WorkflowContextManager;
    workflowExecutionState: WorkflowExecutionState;
    workflowExecutionGraph: WorkflowGraph;
    stepLogger: IWorkflowEventLogger;
    stepExecutionId: string;
    node: GraphNodeUnion;
    stackFrames: StackFrame[];
}
/**
 * Manages the runtime execution state of a workflow, including step execution, results, and transitions.
 *
 * The `StepExecutionRuntime` class is responsible for orchestrating the execution of workflow steps,
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
export declare class StepExecutionRuntime {
    private workflowExecutionState;
    private workflowGraph;
    private stackFrames;
    contextManager: WorkflowContextManager;
    readonly stepExecutionId: string;
    readonly stepLogger: IWorkflowEventLogger;
    readonly node: GraphNodeUnion;
    readonly abortController: AbortController;
    get scopeStack(): WorkflowScopeStack;
    get stepExecution(): EsWorkflowStepExecution | undefined;
    get workflowExecution(): EsWorkflowExecution;
    private get topologicalOrder();
    constructor(stepExecutionRuntimeInit: StepExecutionRuntimeInit);
    stepExecutionExists(): boolean;
    getCurrentStepResult(): RunStepResult | undefined;
    getCurrentStepState(): Record<string, any> | undefined;
    setCurrentStepState(state: Record<string, any> | undefined): void;
    startStep(): void;
    setInput(input: Record<string, unknown>): void;
    finishStep(stepOutput?: Record<string, unknown>): void;
    failStep(error: Error): void;
    flushEventLogs(): Promise<void>;
    /**
     * Attempts to enter a wait state for the step execution based on a relative delay duration.
     * If the step is already in a wait state, it exits the wait state instead.
     *
     * @param delay - The delay duration as a string (e.g., "5s", "1m", "2h").
     * @returns A boolean indicating whether the step has entered a wait state (true) or exited it (false).
     */
    tryEnterDelay(delay: string): boolean;
    /**
     * Attempts to enter a wait state for the step execution.
     * If the step is already in a wait state, it clears the state and returns false (exit wait).
     *
     * "Already waiting" is detected by two complementary signals:
     * - `state.resumeAt` is present: used by timer-based waits (e.g. `wait` step) where a resume
     *   date is written on entry and cleared on exit.
     * - `stepExecution.status === waitingStatus`: used by indefinite waits (e.g. `waitForInput`)
     *   where no `resumeAt` is written but the status alone marks the wait.
     *
     * @param resumeDate - When provided, stored as `resumeAt` so the scheduler can wake the step
     *   at that time. Omit for indefinite waits triggered externally (e.g. resume API).
     * @param waitingStatus - Status to set while waiting. Defaults to `ExecutionStatus.WAITING`.
     * @returns `true` if the step has entered a wait state, `false` if it has exited one.
     */
    tryEnterWaitUntil(resumeDate?: Date, waitingStatus?: ExecutionStatus): boolean;
    /**
     * Builds the step state for entering a wait. When a resumeDate is provided (timer-based),
     * adds resumeAt to existing state. When omitted (indefinite), explicitly strips any residual
     * resumeAt so a prior timer sentinel cannot leak into an indefinite wait record.
     */
    private buildWaitState;
    /** Modifies workflow-level execution state. Use sparingly — prefer step output for step-scoped data. */
    updateWorkflowExecution(update: Partial<EsWorkflowExecution>): void;
    private logStepStart;
    private logStepComplete;
    private logStepFail;
}
export {};
