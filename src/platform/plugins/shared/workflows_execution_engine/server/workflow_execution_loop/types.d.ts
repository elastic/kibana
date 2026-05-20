import type { CoreStart, ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import type { WorkflowGraph } from '@kbn/workflows/graph';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';
import type { NodesFactory } from '../step/nodes_factory';
import type { StepExecutionRuntimeFactory } from '../workflow_context_manager/step_execution_runtime_factory';
import type { StepIoService } from '../workflow_context_manager/step_io_service';
import type { WorkflowExecutionRuntimeManager } from '../workflow_context_manager/workflow_execution_runtime_manager';
import type { WorkflowExecutionState } from '../workflow_context_manager/workflow_execution_state';
import type { IWorkflowEventLogger } from '../workflow_event_logger';
import type { WorkflowTaskManager } from '../workflow_task_manager/workflow_task_manager';
export interface WorkflowExecutionLoopParams {
    workflowExecutionGraph: WorkflowGraph;
    workflowRuntime: WorkflowExecutionRuntimeManager;
    stepExecutionRuntimeFactory: StepExecutionRuntimeFactory;
    workflowExecutionState: WorkflowExecutionState;
    stepIoService: StepIoService;
    workflowLogger: IWorkflowEventLogger;
    workflowExecutionRepository: WorkflowExecutionRepository;
    nodesFactory: NodesFactory;
    esClient: ElasticsearchClient;
    fakeRequest: KibanaRequest<unknown, unknown, unknown>;
    coreStart: CoreStart;
    taskAbortController: AbortController;
    workflowTaskManager: WorkflowTaskManager;
}
