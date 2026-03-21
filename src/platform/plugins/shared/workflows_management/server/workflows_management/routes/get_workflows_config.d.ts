import type { WorkflowsExecutionEnginePluginStart } from '@kbn/workflows-execution-engine/server';
import type { WorkflowsRouter } from '../../types';
export declare function registerGetWorkflowsConfigRoute({ router, getWorkflowExecutionEngine, }: {
    router: WorkflowsRouter;
    getWorkflowExecutionEngine: () => Promise<WorkflowsExecutionEnginePluginStart>;
}): void;
