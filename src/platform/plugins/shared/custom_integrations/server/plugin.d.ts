import type { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '@kbn/core/server';
import type { CustomIntegrationsPluginSetup, CustomIntegrationsPluginStart } from './types';
export declare class CustomIntegrationsPlugin implements Plugin<CustomIntegrationsPluginSetup, CustomIntegrationsPluginStart> {
    private readonly logger;
    private readonly customIngegrationRegistry;
    private readonly branch;
    constructor(initializerContext: PluginInitializerContext);
    setup(core: CoreSetup): CustomIntegrationsPluginSetup;
    start(core: CoreStart): {};
    stop(): void;
}
