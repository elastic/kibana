import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
export declare function makeSampleDataUsageCollector(usageCollection: UsageCollectionSetup, getIndexForType: (type: string) => Promise<string>): void;
