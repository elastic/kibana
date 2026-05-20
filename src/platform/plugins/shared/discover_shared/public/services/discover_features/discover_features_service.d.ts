import type { FeaturesRegistry } from '../../../common';
import type { DiscoverFeature } from './types';
export declare class DiscoverFeaturesService {
    private registry;
    setup(): {
        registry: FeaturesRegistry<DiscoverFeature>;
    };
    start(): {
        registry: FeaturesRegistry<DiscoverFeature>;
    };
}
