import type { PluginInitializerContext } from '@kbn/core/server';
export { config } from './config';
export declare function plugin(initializerContext: PluginInitializerContext): Promise<import("./plugin").WorkflowsPlugin>;
export type { WorkflowsServerPluginSetup, WorkflowsServerPluginStart } from './types';
