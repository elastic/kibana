import type { StackFrame } from '@kbn/workflows';
/**
 * Converts an array of stack frames into a human-readable string representation.
 *
 * This function is particularly useful for debugging workflow execution by providing
 * a clear visualization of the execution path through different steps and their
 * nested scopes.
 *
 * @param stackFrames - Array of stack frame objects to stringify
 * @returns A formatted string showing the execution flow with arrows (->)
 *          connecting each step and its associated nested scopes
 *
 * @example
 * ```typescript
 * const frames = [
 *   { stepId: 'step1', nestedScopes: [{ nodeId: 'node1', scopeId: 'scope1' }] },
 *   { stepId: 'step2', nestedScopes: [{ nodeId: 'node2', scopeId: 'scope2' }] }
 * ];
 * console.log(stringifyStackFrames(frames));
 * // Output: "step1(node1, scope1)  ->  step2(node2, scope2)"
 * ```
 */
export declare function stringifyStackFrames(stackFrames: StackFrame[]): string;
