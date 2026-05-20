import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { ConfigSchema } from '../server/config';
import type { DiscoverSetup, DiscoverSetupPlugins, DiscoverStart, DiscoverStartPlugins } from './types';
/**
 * Contains Discover, one of the oldest parts of Kibana
 * Discover provides embeddables for Dashboards
 */
export declare class DiscoverPlugin implements Plugin<DiscoverSetup, DiscoverStart, DiscoverSetupPlugins, DiscoverStartPlugins> {
    private readonly initializerContext;
    private readonly discoverEbtContext$;
    private readonly appStateUpdater;
    private readonly experimentalFeatures;
    private scopedHistory?;
    private urlTracker?;
    private stopUrlTracking?;
    private locator?;
    private contextLocator?;
    private singleDocLocator?;
    private profileProviderSharedServices?;
    constructor(initializerContext: PluginInitializerContext<ConfigSchema>);
    setup(core: CoreSetup<DiscoverStartPlugins, DiscoverStart>, plugins: DiscoverSetupPlugins): DiscoverSetup;
    start(core: CoreStart, plugins: DiscoverStartPlugins): DiscoverStart;
    stop(): void;
    private createProfileServices;
    private getDiscoverServicesWithProfiles;
    private getDiscoverServices;
    private registerEmbeddable;
}
