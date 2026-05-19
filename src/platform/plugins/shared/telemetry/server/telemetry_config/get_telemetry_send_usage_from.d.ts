import type { TelemetrySavedObject } from '../saved_objects';
interface GetTelemetryUsageFetcherConfig {
    configTelemetrySendUsageFrom: 'browser' | 'server';
    telemetrySavedObject: TelemetrySavedObject;
}
export declare function getTelemetrySendUsageFrom({ telemetrySavedObject, configTelemetrySendUsageFrom, }: GetTelemetryUsageFetcherConfig): "browser" | "server";
export {};
