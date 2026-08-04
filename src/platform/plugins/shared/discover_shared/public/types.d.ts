import type { Plugin } from '@kbn/core/public';
import type { DiscoverFeaturesServiceSetup, DiscoverFeaturesServiceStart } from './services/discover_features';
export interface DiscoverSharedPublicSetup {
    features: DiscoverFeaturesServiceSetup;
}
export interface DiscoverSharedPublicStart {
    features: DiscoverFeaturesServiceStart;
}
export interface DiscoverSharedPublicSetupDeps {
}
export interface DiscoverSharedPublicStartDeps {
}
export type DiscoverSharedPublicPlugin = Plugin<DiscoverSharedPublicSetup, DiscoverSharedPublicStart, DiscoverSharedPublicSetupDeps, DiscoverSharedPublicStartDeps>;
