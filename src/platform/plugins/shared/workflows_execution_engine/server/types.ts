import {
  TaskManagerStartContract,
  TaskManagerSetupContract,
} from '@kbn/task-manager-plugin/server';
import { WorkflowExecutionEngineModel } from '@kbn/workflows';
import { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WorkflowsExecutionEnginePluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WorkflowsExecutionEnginePluginStart {
  executeWorkflow(
    workflow: WorkflowExecutionEngineModel,
    context: Record<string, any>
  ): Promise<void>;
}

export interface WorkflowsExecutionEnginePluginSetupDeps {
  taskManager: TaskManagerSetupContract;
}

export interface WorkflowsExecutionEnginePluginStartDeps {
  taskManager: TaskManagerStartContract;
  actions: ActionsPluginStartContract;
}
