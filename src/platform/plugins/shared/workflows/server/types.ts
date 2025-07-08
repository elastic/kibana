import {
  TaskManagerStartContract,
  TaskManagerSetupContract,
} from '@kbn/task-manager-plugin/server';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WorkflowsPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WorkflowsPluginStart {}

export interface WorkflowsPluginSetupDeps {
  taskManager: TaskManagerSetupContract;
}

export interface WorkflowsPluginStartDeps {
  taskManager: TaskManagerStartContract;
}
