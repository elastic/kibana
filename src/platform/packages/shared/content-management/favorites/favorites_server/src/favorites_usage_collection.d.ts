import type { CoreSetup } from '@kbn/core-lifecycle-server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
export declare function registerFavoritesUsageCollection({ core, usageCollection, }: {
    core: CoreSetup;
    usageCollection: UsageCollectionSetup;
}): void;
