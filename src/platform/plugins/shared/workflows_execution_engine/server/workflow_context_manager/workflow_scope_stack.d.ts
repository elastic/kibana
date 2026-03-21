import type { StackFrame } from '@kbn/workflows';
export interface ScopeData {
    nodeId: string;
    stepId: string;
    nodeType: string;
    scopeId?: string;
}
/**
 * Manages the execution scope stack for workflow execution, tracking nested scopes within workflow steps.
 *
 * This class maintains an immutable stack of execution frames, where each frame represents a workflow step
 * and contains nested scopes for nodes executed within that step. It supports entering and exiting scopes
 * while preserving the hierarchical execution context.
 *
 * The class is immutable - all operations return new instances rather than modifying the current instance.
 * This ensures thread safety and enables features like execution rollback and debugging.
 */
export declare class WorkflowScopeStack {
    private _stackFrames;
    /**
     * Creates a new WorkflowScopeStack instance from existing stack frames.
     *
     * This static factory method creates a new immutable instance containing deep copies
     * of the provided frames to ensure isolation from the source data.
     *
     * @param stackFrames - Array of stack frames to initialize the scope stack with
     * @returns A new WorkflowScopeStack instance containing the cloned frames
     */
    static fromStackFrames(stackFrames: StackFrame[]): WorkflowScopeStack;
    /**
     * Gets a deep copy of all stack frames in the current scope stack.
     *
     * Returns an immutable view of the internal stack frames to prevent external mutation
     * while allowing inspection of the current execution state.
     *
     * @returns A deep copy of the current stack frames array
     */
    get stackFrames(): StackFrame[];
    /**
     * Checks if the workflow scope stack is empty.
     *
     * @returns True if the stack contains no frames, false otherwise.
     */
    isEmpty(): boolean;
    /**
     * Retrieves the current scope data from the top of the scope stack.
     *
     * This method returns the scope information for the most recently entered scope
     * within the current step frame. If the stack is empty, it returns null.
     *
     * @returns The current scope data containing node ID, node type, scope ID, and step ID,
     *          or null if the stack is empty
     */
    getCurrentScope(): ScopeData | null;
    /**
     * Enters a new execution scope for the given graph node.
     *
     * If the node belongs to the same step as the current top frame, adds a new nested scope
     * to that frame. Otherwise, creates a new frame for the step. This method is immutable
     * and returns a new WorkflowScopeStack instance.
     *
     * @param enterScopeData - Data required to enter the new scope
     * @returns A new WorkflowScopeStack instance with the entered scope
     */
    enterScope(enterScopeData: ScopeData): WorkflowScopeStack;
    /**
     * Exits the current execution scope for the given graph node.
     *
     * If the current top frame has multiple nested scopes for the same step, removes the most
     * recent scope. If only one scope remains, removes the entire frame. This method is immutable
     * and returns a new WorkflowScopeStack instance.
     *
     * @returns A new WorkflowScopeStack instance with the exited scope removed
     */
    exitScope(): WorkflowScopeStack;
    /**
     * Creates deep copies of all stack frames to ensure immutability.
     *
     * This private method performs a deep clone of the internal stack frames array,
     * including all nested scope objects, to prevent external mutation of the internal state.
     *
     * @returns A deep copy of the current stack frames with all nested objects cloned
     */
    private cloneFrames;
}
