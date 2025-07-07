import {
  TaskManagerStartContract,
  TaskManagerSetupContract,
} from '@kbn/task-manager-plugin/server';

export interface WorkflowsPluginSetupDeps {
  taskManager: TaskManagerSetupContract;
}

export interface WorkflowsPluginStartDeps {
  taskManager: TaskManagerStartContract;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WorkflowsPluginSetup {}

export interface WorkflowsPluginStart {
  pushEvent(eventType: string, eventData: Record<string, any>): void;
}
