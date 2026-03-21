import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { WorkflowsExtensionsServerPluginSetup, WorkflowsExtensionsServerPluginSetupDeps, WorkflowsExtensionsServerPluginStart, WorkflowsExtensionsServerPluginStartDeps } from './types';
export declare class WorkflowsExtensionsServerPlugin implements Plugin<WorkflowsExtensionsServerPluginSetup, WorkflowsExtensionsServerPluginStart, WorkflowsExtensionsServerPluginSetupDeps, WorkflowsExtensionsServerPluginStartDeps> {
    private readonly logger;
    private readonly stepRegistry;
    private readonly triggerRegistry;
    private triggerEventHandler;
    private emitEventFn;
    constructor(initializerContext: PluginInitializerContext);
    setup(core: CoreSetup<WorkflowsExtensionsServerPluginStartDeps>, _plugins: WorkflowsExtensionsServerPluginSetupDeps): WorkflowsExtensionsServerPluginSetup;
    start(_core: CoreStart, _plugins: WorkflowsExtensionsServerPluginStartDeps): WorkflowsExtensionsServerPluginStart;
    stop(): void;
}
