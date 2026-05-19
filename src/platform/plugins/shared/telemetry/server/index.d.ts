import type { PluginInitializerContext } from '@kbn/core/server';
import type { TelemetryConfigType } from './config';
export { config } from './config';
export type { TelemetryPluginSetup, TelemetryPluginStart } from './plugin';
export declare const plugin: (initializerContext: PluginInitializerContext<TelemetryConfigType>) => Promise<import("./plugin").TelemetryPlugin>;
export { getClusterUuids, getLocalStats } from './telemetry_collection';
export type { TelemetryLocalStats, DataTelemetryPayload, DataTelemetryDocument, DataTelemetryBasePayload, NodeUsage, } from './telemetry_collection';
