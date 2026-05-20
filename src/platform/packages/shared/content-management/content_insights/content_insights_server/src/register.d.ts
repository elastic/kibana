import type { UsageCollectionSetup, UsageCollectionStart } from '@kbn/usage-collection-plugin/server';
import type { CoreSetup } from '@kbn/core/server';
/**
 * Configuration for the usage counter
 */
export interface ContentInsightsConfig {
    /**
     * e.g. 'dashboard'
     * passed as a domainId to usage counter apis
     */
    domainId: string;
    /**
     * Can control created routes access via security access control
     */
    routePrivileges?: string[];
    /**
     * Retention period in days for usage counter data
     */
    retentionPeriodDays?: number;
}
export interface ContentInsightsDependencies {
    usageCollection: UsageCollectionSetup;
    http: CoreSetup['http'];
    getStartServices: () => Promise<{
        usageCollection: UsageCollectionStart;
    }>;
}
export interface ContentInsightsStatsResponse {
    result: ContentInsightsStats;
}
export interface ContentInsightsStats {
    /**
     * The date from which the data is counted
     */
    from: string;
    /**
     * Total count of events
     */
    count: number;
    /**
     * Daily counts of events
     */
    daily: Array<{
        date: string;
        count: number;
    }>;
}
export declare const registerContentInsights: ({ usageCollection, http, getStartServices }: ContentInsightsDependencies, config: ContentInsightsConfig) => void;
