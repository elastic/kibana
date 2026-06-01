/**
 * Configuration for Default Logs profile recommended fields.
 * This is used as a fallback when no specific log sub-profile matches.
 * The wildcard pattern 'logs-*' ensures these fields are available for
 * any logs index that doesn't have more specific profile.
 */
export declare const DEFAULT_LOGS_PROFILE: {
    readonly pattern: "logs-*";
    readonly recommendedFields: readonly ["event.dataset", "host.name", "log.level", "message", "service.name"];
};
export type DefaultLogsProfile = typeof DEFAULT_LOGS_PROFILE;
