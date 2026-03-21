import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { WorkflowsExecutionEngineConfig } from '../config';
import type { WorkflowsMeteringService } from '../metering';
import type { WorkflowsExecutionEnginePluginStart } from '../types';
import type { ContextDependencies } from '../workflow_context_manager/types';
export declare function runWorkflow({ workflowRunId, spaceId, taskAbortController, logger, config, fakeRequest, dependencies, workflowsExecutionEngine, meteringService, isEventDrivenExecutionEnabled, }: {
    workflowRunId: string;
    spaceId: string;
    taskAbortController: AbortController;
    logger: Logger;
    config: WorkflowsExecutionEngineConfig;
    fakeRequest: KibanaRequest;
    dependencies: ContextDependencies;
    workflowsExecutionEngine?: WorkflowsExecutionEnginePluginStart;
    meteringService?: WorkflowsMeteringService;
    isEventDrivenExecutionEnabled?: () => boolean;
}): Promise<void>;
