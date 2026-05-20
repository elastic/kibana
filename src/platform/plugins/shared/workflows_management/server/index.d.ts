import type { PluginInitializerContext } from '@kbn/core/server';
export { config } from './config';
export declare function plugin(initializerContext: PluginInitializerContext): Promise<import("./plugin").WorkflowsPlugin>;
export type { WorkflowsServerPluginSetup, WorkflowsServerPluginStart } from './types';
export type { BulkScheduleWorkflowItem, WorkflowsManagementApi, } from './api/workflows_management_api';
