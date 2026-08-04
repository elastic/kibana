import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
export declare function makeKQLUsageCollector(usageCollection: UsageCollectionSetup, getIndexForType: (type: string) => Promise<string>): void;
