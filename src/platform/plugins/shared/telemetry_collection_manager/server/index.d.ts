import type { PluginInitializerContext } from '@kbn/core/server';
export declare function plugin(initializerContext: PluginInitializerContext): Promise<import("./plugin").TelemetryCollectionManagerPlugin>;
export type { TelemetryCollectionManagerPluginSetup, TelemetryCollectionManagerPluginStart, StatsCollectionConfig, StatsGetter, StatsGetterConfig, StatsCollectionContext, ClusterDetails, ClusterDetailsGetter, UsageStatsPayload, } from './types';
