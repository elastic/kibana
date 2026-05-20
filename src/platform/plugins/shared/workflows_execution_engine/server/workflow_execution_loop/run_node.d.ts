import type { WorkflowExecutionLoopParams } from './types';
/**
 * Executes a single step in the workflow execution process.
 *
 * This function orchestrates the execution of a workflow node by:
 * 1. Creating a context manager for the current step
 * 2. Checking in-memory workflow state to skip execution if already cancelled
 * 3. Creating and running the node implementation
 * 4. Running monitoring in parallel to handle cancellation, timeouts, and other control flow
 * 5. Managing error handling and state persistence
 *
 * The execution uses a race condition between the step execution and monitoring to ensure
 * proper cancellation and timeout handling. The async monitoring loop runs every 500ms in
 * parallel with step execution to detect cancellations without blocking step startup.
 *
 * @param params - The workflow execution loop parameters containing:
 *   - workflowRuntime: Runtime instance managing workflow state and navigation
 *   - workflowExecutionGraph: The workflow graph definition
 *   - workflowExecutionState: Current execution state
 *   - nodesFactory: Factory for creating node implementations
 *   - esClient: Elasticsearch client for data operations
 *   - fakeRequest: Request object for context
 *   - coreStart: Kibana core services
 *
 * @returns Promise that resolves when the step execution is complete
 *
 * @throws Will catch and handle errors through the workflow runtime's error handling mechanism
 */
export declare function runNode(params: WorkflowExecutionLoopParams): Promise<void>;
