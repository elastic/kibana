import type { TelemetrySavedObject } from '../saved_objects';
interface GetTelemetryOptInConfig {
    telemetrySavedObject: TelemetrySavedObject;
    currentKibanaVersion: string;
    allowChangingOptInStatus: boolean;
    configTelemetryOptIn: boolean | null;
}
type GetTelemetryOptIn = (config: GetTelemetryOptInConfig) => null | boolean;
export declare const getTelemetryOptIn: GetTelemetryOptIn;
export {};
