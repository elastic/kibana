import type { CoreStart, KibanaRequest } from '@kbn/core/server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { StackFrame } from '@kbn/workflows';
import type { WorkflowGraph } from '@kbn/workflows/graph';
import { StepExecutionRuntime } from './step_execution_runtime';
import type { StepIoService } from './step_io_service';
import type { ContextDependencies } from './types';
import type { WorkflowExecutionState } from './workflow_execution_state';
import type { IWorkflowEventLogger } from '../workflow_event_logger';
/**
 * Factory class responsible for creating StepExecutionRuntime instances.
 *
 * This class separates the step execution runtime initialization logic from the
 * step execution runtime itself, providing a clean abstraction for runtime creation.
 * It encapsulates the complex setup required for step execution including workflow state,
 * graph navigation, logging, and context management.
 *
 * @example
 * ```typescript
 * const factory = new StepExecutionRuntimeFactory({
 *   workflowExecutionState,
 *   workflowExecutionGraph,
 *   workflowLogger,
 *   esClient,
 *   fakeRequest,
 *   coreStart
 * });
 *
 * const runtime = factory.createStepExecutionRuntime({
 *   node: graphNode,
 *   stackFrames: currentStackFrames
 * });
 * ```
 */
export declare class StepExecutionRuntimeFactory {
    private params;
    constructor(params: {
        workflowExecutionState: WorkflowExecutionState;
        stepIoService: StepIoService;
        workflowExecutionGraph: WorkflowGraph;
        workflowLogger: IWorkflowEventLogger;
        esClient: ElasticsearchClient;
        fakeRequest: KibanaRequest;
        coreStart: CoreStart;
        dependencies: ContextDependencies;
    });
    createStepExecutionRuntime({ nodeId, stackFrames, }: {
        nodeId: string;
        stackFrames: StackFrame[];
    }): StepExecutionRuntime;
}
