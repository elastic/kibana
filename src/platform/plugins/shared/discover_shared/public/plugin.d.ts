import type { DiscoverSharedPublicPlugin } from './types';
export declare class DiscoverSharedPlugin implements DiscoverSharedPublicPlugin {
    private discoverFeaturesService;
    setup(): {
        features: {
            registry: import("../common").FeaturesRegistry<import(".").DiscoverFeature>;
        };
    };
    start(): {
        features: {
            registry: import("../common").FeaturesRegistry<import(".").DiscoverFeature>;
        };
    };
}
