import type { DiscoverSharedPublicPlugin } from './types';
export declare class DiscoverSharedPlugin implements DiscoverSharedPublicPlugin {
    private discoverFeaturesService;
    setup(): {
        features: {
            registry: import("../common").FeaturesRegistry<import("./services/discover_features").DiscoverFeature>;
        };
    };
    start(): {
        features: {
            registry: import("../common").FeaturesRegistry<import("./services/discover_features").DiscoverFeature>;
        };
    };
}
