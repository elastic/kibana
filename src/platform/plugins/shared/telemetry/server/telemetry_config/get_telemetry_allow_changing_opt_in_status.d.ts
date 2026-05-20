import type { TelemetrySavedObject } from '../saved_objects';
interface GetTelemetryAllowChangingOptInStatus {
    configTelemetryAllowChangingOptInStatus: boolean;
    telemetrySavedObject?: TelemetrySavedObject;
}
export declare function getTelemetryAllowChangingOptInStatus({ telemetrySavedObject, configTelemetryAllowChangingOptInStatus, }: GetTelemetryAllowChangingOptInStatus): boolean;
export {};
