import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionLoopParams } from '../types';
/**
 * Processes the node stack and invokes monitor() on each monitorable node.
 *
 * This function traverses the node stack from outermost to innermost scope,
 * creating appropriate execution contexts for each node and invoking their
 * monitor() method if they implement the MonitorableNode interface.
 *
 * @param params - Workflow execution loop parameters containing factories and state
 * @param monitoredStepExecutionRuntime - The runtime context for the step being monitored
 *
 * @returns Promise that resolves when all nodes in the stack have been processed
 */
export declare function processNodeStackMonitoring(params: WorkflowExecutionLoopParams, monitoredStepExecutionRuntime: StepExecutionRuntime): Promise<void>;
