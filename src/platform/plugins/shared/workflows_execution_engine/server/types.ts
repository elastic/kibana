import {
  TaskManagerStartContract,
  TaskManagerSetupContract,
} from '@kbn/task-manager-plugin/server';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WorkflowsExecutionEnginePluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WorkflowsExecutionEnginePluginStart {}

export interface WorkflowsExecutionEnginePluginSetupDeps {
  taskManager: TaskManagerSetupContract;
}

export interface WorkflowsExecutionEnginePluginStartDeps {
  taskManager: TaskManagerStartContract;
}
