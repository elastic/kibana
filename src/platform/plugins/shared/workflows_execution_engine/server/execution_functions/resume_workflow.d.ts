import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { WorkflowsExecutionEngineConfig } from '../config';
import type { WorkflowsMeteringService } from '../metering';
import type { InternalResumeWorkflowExecution, WorkflowsExecutionEnginePluginStart } from '../types';
import type { ContextDependencies } from '../workflow_context_manager/types';
export declare function resumeWorkflow({ workflowRunId, spaceId, taskAbortController, dependencies, logger, config, fakeRequest, workflowsExecutionEngine, meteringService, internalResumeWorkflowExecution, }: {
    workflowRunId: string;
    spaceId: string;
    taskAbortController: AbortController;
    logger: Logger;
    config: WorkflowsExecutionEngineConfig;
    fakeRequest: KibanaRequest;
    dependencies: ContextDependencies;
    workflowsExecutionEngine: WorkflowsExecutionEnginePluginStart;
    meteringService?: WorkflowsMeteringService;
    internalResumeWorkflowExecution?: InternalResumeWorkflowExecution;
}): Promise<void>;
