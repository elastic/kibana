import type { Logger } from '@kbn/core/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
export interface ReportedUsage {
    transientCount: number;
    persistedCount: number;
    totalCount: number;
}
export declare function registerUsageCollector(usageCollection: UsageCollectionSetup, getIndexForType: (type: string) => Promise<string>, logger: Logger): void;
