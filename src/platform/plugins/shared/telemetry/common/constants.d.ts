/**
 * The amount of time, in milliseconds, to wait between reports when enabled.
 * Currently, 24 hours.
 */
export declare const REPORT_INTERVAL_MS = 86400000;
/**
 * The buffer time, in milliseconds, to consider the {@link REPORT_INTERVAL_MS} as expired.
 * Currently, 2 minutes.
 */
export declare const REPORT_INTERVAL_BUFFER_MS = 120000;
/**
 * How often we poll for the opt-in status.
 * Currently, 10 seconds.
 */
export declare const OPT_IN_POLL_INTERVAL_MS = 10000;
/**
 * Key for the localStorage service
 */
export declare const LOCALSTORAGE_KEY = "telemetry.data";
/**
 * Link to Advanced Settings.
 */
export declare const PATH_TO_ADVANCED_SETTINGS = "/app/management/kibana/settings";
/**
 * The telemetry payload content encryption encoding
 */
export declare const PAYLOAD_CONTENT_ENCODING = "aes256gcm";
/**
 * The endpoint version when hitting the remote telemetry service
 */
export declare const ENDPOINT_VERSION = "v3";
/**
 * The staging telemetry endpoint for the remote telemetry service.
 */
export declare const ENDPOINT_STAGING = "https://telemetry-staging.elastic.co/";
/**
 * The production telemetry endpoint for the remote telemetry service.
 */
export declare const ENDPOINT_PROD = "https://telemetry.elastic.co/";
/**
 * The telemetry channels for the remote telemetry service.
 */
export declare const TELEMETRY_CHANNELS: {
    SNAPSHOT_CHANNEL: string;
    OPT_IN_STATUS_CHANNEL: string;
};
