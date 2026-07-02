import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { WorkflowsExtensionsPublicPluginSetup, WorkflowsExtensionsPublicPluginSetupDeps, WorkflowsExtensionsPublicPluginStart, WorkflowsExtensionsPublicPluginStartDeps } from './types';
export declare class WorkflowsExtensionsPublicPlugin implements Plugin<WorkflowsExtensionsPublicPluginSetup, WorkflowsExtensionsPublicPluginStart, WorkflowsExtensionsPublicPluginSetupDeps, WorkflowsExtensionsPublicPluginStartDeps> {
    private readonly stepRegistry;
    private readonly triggerRegistry;
    constructor(initializerContext: PluginInitializerContext);
    setup(_core: CoreSetup, _plugins: WorkflowsExtensionsPublicPluginSetupDeps): WorkflowsExtensionsPublicPluginSetup;
    start(_core: CoreStart, _plugins: WorkflowsExtensionsPublicPluginStartDeps): WorkflowsExtensionsPublicPluginStart;
    stop(): void;
}
