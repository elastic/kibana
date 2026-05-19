import type { AppMountParameters, CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { UrlForwardingSetup, UrlForwardingStart } from '@kbn/url-forwarding-plugin/public';
import type { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/public';
import type { ConfigSchema } from '../server/config';
import type { EnvironmentServiceSetup, FeatureCatalogueRegistrySetup, TutorialServiceSetup, AddDataServiceSetup, WelcomeServiceSetup } from './services';
import { FeatureCatalogueRegistry } from './services';
export interface HomePluginStartDependencies {
    dataViews: DataViewsPublicPluginStart;
    urlForwarding: UrlForwardingStart;
    cloud: CloudStart;
    share: SharePluginStart;
    history: AppMountParameters['history'];
}
export interface HomePluginSetupDependencies {
    cloud: CloudSetup;
    share: SharePluginSetup;
    usageCollection?: UsageCollectionSetup;
    urlForwarding: UrlForwardingSetup;
}
export declare class HomePublicPlugin implements Plugin<HomePublicPluginSetup, HomePublicPluginStart, HomePluginSetupDependencies, HomePluginStartDependencies> {
    private readonly initializerContext;
    private readonly featuresCatalogueRegistry;
    private readonly environmentService;
    private readonly tutorialService;
    private readonly addDataService;
    private readonly welcomeService;
    constructor(initializerContext: PluginInitializerContext<ConfigSchema>);
    setup(core: CoreSetup<HomePluginStartDependencies>, { cloud, share, urlForwarding, usageCollection }: HomePluginSetupDependencies): HomePublicPluginSetup;
    start({ application: { capabilities } }: CoreStart): {
        featureCatalogue: FeatureCatalogueRegistry;
    };
}
/** @public */
export type FeatureCatalogueSetup = FeatureCatalogueRegistrySetup;
/** @public */
export type EnvironmentSetup = EnvironmentServiceSetup;
/** @public */
export type TutorialSetup = TutorialServiceSetup;
/** @public */
export type AddDataSetup = AddDataServiceSetup;
/** @public */
export interface HomePublicPluginSetup {
    tutorials: TutorialServiceSetup;
    addData: AddDataServiceSetup;
    featureCatalogue: FeatureCatalogueSetup;
    welcomeScreen: WelcomeServiceSetup;
    /**
     * The environment service is only available for a transition period and will
     * be replaced by display specific extension points.
     * @deprecated
     * @removeBy 8.8.0
     */
    environment: EnvironmentSetup;
}
export interface HomePublicPluginStart {
    featureCatalogue: FeatureCatalogueRegistry;
}
