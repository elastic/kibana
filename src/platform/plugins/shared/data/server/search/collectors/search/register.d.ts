import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
export interface CollectedUsage {
    successCount: number;
    errorCount: number;
    totalDuration: number;
}
export interface ReportedUsage {
    successCount: number;
    errorCount: number;
    averageDuration: number | null;
}
export declare function registerUsageCollector(usageCollection: UsageCollectionSetup, getIndexForType: (type: string) => Promise<string>): void;
