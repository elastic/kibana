import { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { WorkflowsExecutionEnginePluginStart } from '@kbn/workflows-execution-engine/server';
import { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server/plugin';
import { WorkflowExecutionEngineModel } from '@kbn/workflows';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WorkflowsPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WorkflowsPluginStart {
  runWorkflow(workflow: WorkflowExecutionEngineModel, params: Record<string, any>): Promise<string>;
}

export interface WorkflowsExecutionEnginePluginStartDeps {
  taskManager: TaskManagerStartContract;
  workflowsExecutionEngine: WorkflowsExecutionEnginePluginStart;
  actions: ActionsPluginStartContract;
}
