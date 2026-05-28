/**
 * Configuration for Apache Error Logs profile recommended fields
 */
export declare const APACHE_ERROR_LOGS_PROFILE: {
    readonly pattern: "logs-apache.error";
    readonly recommendedFields: readonly ["client.ip", "destination.ip", "http.request.method", "http.response.bytes", "http.response.status_code", "log.level", "message", "referrer", "source.ip", "url.path", "user.agent"];
};
export type ApacheErrorLogsProfile = typeof APACHE_ERROR_LOGS_PROFILE;
