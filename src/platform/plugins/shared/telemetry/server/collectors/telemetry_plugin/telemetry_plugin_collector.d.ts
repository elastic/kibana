import type { Observable } from 'rxjs';
import type { ISavedObjectsRepository } from '@kbn/core/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { TelemetryConfigType } from '../../config';
export interface TelemetryUsageStats {
    opt_in_status?: boolean | null;
    usage_fetcher?: 'browser' | 'server';
    last_reported?: number;
    labels: Record<string, unknown>;
}
export interface TelemetryPluginUsageCollectorOptions {
    currentKibanaVersion: string;
    config$: Observable<TelemetryConfigType>;
    getSavedObjectsClient: () => ISavedObjectsRepository | undefined;
}
export declare function createCollectorFetch({ currentKibanaVersion, config$, getSavedObjectsClient, }: TelemetryPluginUsageCollectorOptions): () => Promise<TelemetryUsageStats>;
export declare function registerTelemetryPluginUsageCollector(usageCollection: UsageCollectionSetup, options: TelemetryPluginUsageCollectorOptions): void;
