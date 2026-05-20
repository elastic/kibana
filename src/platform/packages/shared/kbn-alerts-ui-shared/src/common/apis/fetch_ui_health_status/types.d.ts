export interface UiHealthCheck {
    isRulesAvailable: boolean;
}
export interface UiHealthCheckResponse {
    isAlertsAvailable: boolean;
}
export declare const healthCheckErrors: {
    readonly ALERTS_ERROR: "alertsError";
    readonly ENCRYPTION_ERROR: "encryptionError";
    readonly API_KEYS_DISABLED_ERROR: "apiKeysDisabledError";
    readonly API_KEYS_AND_ENCRYPTION_ERROR: "apiKeysAndEncryptionError";
};
export type HealthCheckErrors = (typeof healthCheckErrors)[keyof typeof healthCheckErrors];
