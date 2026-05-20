import type { WorkflowExecutionLoopParams } from './types';
import type { StepExecutionRuntime } from '../workflow_context_manager/step_execution_runtime';
/**
 * Handles workflow execution errors by bubbling them up through the scope hierarchy
 * and invoking error handlers at each level.
 *
 * This function implements a sophisticated error handling mechanism that:
 * 1. Marks the failed step as FAILED in the execution state
 * 2. Traverses the scope stack in reverse order (bottom-up) to handle errors at each nested level
 * 3. Invokes custom error handlers on nodes that implement the `NodeWithErrorCatching` interface
 * 4. Ensures proper cleanup and state consistency during error propagation
 *
 * The error bubbling process works by:
 * - Starting from the innermost scope where the error occurred
 * - Moving outward through each parent scope in the stack
 * - Giving each scope's node a chance to handle or transform the error
 * - Continuing until either the error is resolved or all scopes are exhausted
 *
 * Error handling flow:
 * 1. Check if there's an active workflow error, return early if none
 * 2. Update the failed step's status to FAILED with error details
 * 3. Iterate through scope stack from innermost to outermost:
 *    - Navigate to the scope's node and exit the current scope
 *    - Create a step context for the error-handling node
 *    - Check if the node implements error catching capabilities
 *    - Invoke the node's catchError method if available
 *    - Handle any errors thrown during error handling itself
 *    - Update step status if error persists after handling attempt
 * 4. Continue until error is resolved or scope stack is exhausted
 *
 * @param params - The workflow execution parameters containing:
 *   - workflowRuntime: Runtime manager for workflow state and navigation
 *   - workflowExecutionGraph: The workflow graph definition
 *   - workflowExecutionState: Current execution state for step updates
 *   - workflowLogger: Logger for error events and debugging
 *   - nodesFactory: Factory for creating node implementations
 *   - esClient: Elasticsearch client for data operations
 *   - fakeRequest: Request context for service interactions
 *   - coreStart: Kibana core services
 *
 * @param failedStepExecutionRuntime - The context manager for the step that originally failed,
 *   used to update the step's status and identify the failure point
 */
export declare function catchError(params: WorkflowExecutionLoopParams, failedStepExecutionRuntime: StepExecutionRuntime): Promise<void>;
