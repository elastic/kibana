import { WorkflowsPluginStart } from '@kbn/workflows-management-plugin/server';

/* eslint-disable @typescript-eslint/no-empty-interface */
export interface WorkflowsExamplePluginSetupDeps {}

export interface WorkflowsExamplePluginStartDeps {
  workflowsManagement: WorkflowsPluginStart;
}
export interface WorkflowsExamplePluginSetup {}

export interface WorkflowsExamplePluginStart {}
