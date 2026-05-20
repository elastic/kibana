import type { WorkflowExecutionLoopParams } from './types';
import type { StepExecutionRuntime } from '../workflow_context_manager/step_execution_runtime';
export declare function handleExecutionDelay(params: WorkflowExecutionLoopParams, stepExecutionRuntime: StepExecutionRuntime): Promise<void>;
