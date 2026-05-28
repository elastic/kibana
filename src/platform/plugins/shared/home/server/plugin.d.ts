import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { CustomIntegrationsPluginSetup } from '@kbn/custom-integrations-plugin/server';
import type { TutorialsRegistrySetup, TutorialsRegistryStart, SampleDataRegistrySetup, SampleDataRegistryStart } from './services';
export interface HomeServerPluginSetupDependencies {
    usageCollection?: UsageCollectionSetup;
    customIntegrations?: CustomIntegrationsPluginSetup;
}
export declare class HomeServerPlugin implements Plugin<HomeServerPluginSetup, HomeServerPluginStart> {
    private readonly initContext;
    private readonly tutorialsRegistry;
    private readonly sampleDataRegistry;
    private customIntegrations?;
    private readonly isDevMode;
    constructor(initContext: PluginInitializerContext);
    setup(core: CoreSetup, plugins: HomeServerPluginSetupDependencies): HomeServerPluginSetup;
    start(core: CoreStart): HomeServerPluginStart;
}
/** @public */
export interface HomeServerPluginSetup {
    tutorials: TutorialsRegistrySetup;
    sampleData: SampleDataRegistrySetup;
}
/** @public */
export interface HomeServerPluginStart {
    tutorials: TutorialsRegistryStart;
    sampleData: SampleDataRegistryStart;
}
