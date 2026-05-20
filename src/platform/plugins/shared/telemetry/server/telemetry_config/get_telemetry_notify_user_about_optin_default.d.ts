import type { TelemetrySavedObject } from '../saved_objects';
interface NotifyOpts {
    allowChangingOptInStatus: boolean;
    telemetrySavedObject: TelemetrySavedObject;
    telemetryOptedIn: boolean | null;
    configTelemetryOptIn: boolean;
}
export declare function getNotifyUserAboutOptInDefault({ allowChangingOptInStatus, telemetrySavedObject, telemetryOptedIn, configTelemetryOptIn, }: NotifyOpts): boolean;
export {};
