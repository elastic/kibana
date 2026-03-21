import type { StackFrame } from '@kbn/workflows';
/**
 * Generates a unique identifier for a step execution by combining execution ID, path, and step ID,
 * then hashing the result with SHA-256.
 * The ID is deterministic and predictable because it's derived from static
 * workflow state components (execution ID, path, step ID) rather than random values.
 * This ensures the same step in the same execution context will always generate
 * the same ID, enabling reliable step tracking and idempotent operations.
 *
 * @param executionId - The unique identifier of the workflow execution
 * @param stepId - The unique identifier of the step within the workflow
 * @param stackFrames - An array of StackFrame objects representing the hierarchical path to the step
 * @returns A SHA-256 hash string representing the unique step execution identifier
 *
 * @example
 * ```typescript
 * const stackFrames = [{ stepId: 'foreachstep', subScopeId: '1' }];
 * const stepExecId = buildStepExecutionId(
 *   'workflow-exec-abc123',
 *   'connector-send-email',
 *   stackFrames
 * );
 * // Returns: "7f8a9b2c3d4e5f6a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5"
 * ```
 */
export declare function buildStepExecutionId(executionId: string, stepId: string, stackFrames: StackFrame[]): string;
