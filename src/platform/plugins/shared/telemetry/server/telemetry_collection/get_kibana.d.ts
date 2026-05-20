import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { StatsCollectionContext } from '@kbn/telemetry-collection-manager-plugin/server';
export interface KibanaUsageStats {
    kibana: {
        index: string;
    };
    kibana_stats: {
        os: {
            platform: string | undefined;
            platformRelease: string | undefined;
            distro?: string;
            distroRelease?: string;
        };
    };
    [plugin: string]: Record<string, unknown>;
}
export declare function handleKibanaStats({ logger, version: serverVersion }: StatsCollectionContext, response?: KibanaUsageStats): {
    count: number;
    indices: number;
    os: Record<string, unknown[]>;
    versions: {
        version: string;
        count: number;
    }[];
    plugins: {
        [plugin: string]: Record<string, unknown>;
    };
} | undefined;
export declare function getKibana(usageCollection: UsageCollectionSetup, asInternalUser: ElasticsearchClient, soClient: SavedObjectsClientContract): Promise<KibanaUsageStats>;
