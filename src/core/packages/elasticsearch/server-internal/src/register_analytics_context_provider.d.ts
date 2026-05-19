import type { Observable } from 'rxjs';
import type { AnalyticsServiceSetup } from '@kbn/core-analytics-server';
import type { ClusterInfo } from './get_cluster_info';
/**
 * Registers the Analytics context provider to enrich events with the cluster info.
 * @param analytics Analytics service.
 * @param context$ Observable emitting the cluster info.
 * @internal
 */
export declare function registerAnalyticsContextProvider(analytics: AnalyticsServiceSetup, context$: Observable<ClusterInfo>): void;
