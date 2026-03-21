import type { PluginInitializerContext } from '@kbn/core/server';
export { config } from './config';
export declare function plugin(initializerContext: PluginInitializerContext): Promise<import("./plugin").WorkflowsExtensionsServerPlugin>;
export type { EmitEventFn, EmitEventParams, ServerTriggerDefinition, TriggerEventHandlerParams, WorkflowsClient, WorkflowsRouteHandlerContext, WorkflowsExtensionsServerPluginSetup, WorkflowsExtensionsServerPluginStart, WorkflowsExtensionsServerPluginSetupDeps, WorkflowsExtensionsServerPluginStartDeps, } from './types';
export type { ServerStepDefinition, StepHandler, StepHandlerContext, StepHandlerResult, OnCancelHandler, } from './step_registry/types';
export { createServerStepDefinition } from './step_registry/types';
export { TriggerRegistry } from './trigger_registry';
