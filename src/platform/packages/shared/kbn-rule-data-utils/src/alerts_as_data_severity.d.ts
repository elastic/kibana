export declare const ALERT_SEVERITY_INFO = "info";
export declare const ALERT_SEVERITY_LOW = "low";
export declare const ALERT_SEVERITY_MEDIUM = "medium";
export declare const ALERT_SEVERITY_HIGH = "high";
export declare const ALERT_SEVERITY_CRITICAL = "critical";
export declare const ALERT_SEVERITY_WARNING = "warning";
export declare const ALERT_SEVERITY_MINOR = "minor";
export declare const ALERT_SEVERITY_MAJOR = "major";
export type AlertSeverity = typeof ALERT_SEVERITY_INFO | typeof ALERT_SEVERITY_LOW | typeof ALERT_SEVERITY_MEDIUM | typeof ALERT_SEVERITY_HIGH | typeof ALERT_SEVERITY_CRITICAL | typeof ALERT_SEVERITY_WARNING | typeof ALERT_SEVERITY_MINOR | typeof ALERT_SEVERITY_MAJOR;
/**
 * Ordered list of severity values from highest to lowest, intended for UX
 * surfaces and for runtime validation in API schemas.
 */
export declare const ALERT_SEVERITY_VALUES: readonly ["critical", "major", "high", "medium", "minor", "low", "warning", "info"];
