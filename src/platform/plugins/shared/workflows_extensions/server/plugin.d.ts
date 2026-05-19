import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { WorkflowsExtensionsServerPluginSetup, WorkflowsExtensionsServerPluginSetupDeps, WorkflowsExtensionsServerPluginStart, WorkflowsExtensionsServerPluginStartDeps } from './types';
export declare class WorkflowsExtensionsServerPlugin implements Plugin<WorkflowsExtensionsServerPluginSetup, WorkflowsExtensionsServerPluginStart, WorkflowsExtensionsServerPluginSetupDeps, WorkflowsExtensionsServerPluginStartDeps> {
    private readonly logger;
    private readonly stepRegistry;
    private readonly triggerRegistry;
    private workflowsClientProvider;
    constructor(initializerContext: PluginInitializerContext);
    setup(core: CoreSetup<WorkflowsExtensionsServerPluginStartDeps>, plugins: WorkflowsExtensionsServerPluginSetupDeps): WorkflowsExtensionsServerPluginSetup;
    start(_core: CoreStart, _plugins: WorkflowsExtensionsServerPluginStartDeps): WorkflowsExtensionsServerPluginStart;
    stop(): void;
    /**
     * Returns a noop workflows client to avoid errors when the workflows client provider is not set.
     * This scenario should never happen, but it's a fallback to avoid errors in case not all workflows plugins are enabled.
     * @returns A noop workflows client
     */
    private getNoopWorkflowsClient;
}
