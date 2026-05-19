import type { TelemetrySavedObject } from '../saved_objects';
interface GetTelemetryFailureDetailsConfig {
    telemetrySavedObject: TelemetrySavedObject;
}
export interface TelemetryFailureDetails {
    failureCount: number;
    failureVersion?: string;
}
export declare function getTelemetryFailureDetails({ telemetrySavedObject, }: GetTelemetryFailureDetailsConfig): TelemetryFailureDetails;
export {};
