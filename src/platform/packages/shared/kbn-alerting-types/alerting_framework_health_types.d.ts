export declare enum HealthStatus {
    OK = "ok",
    Warning = "warn",
    Error = "error"
}
export interface AlertsHealth {
    decryptionHealth: {
        status: HealthStatus;
        timestamp: string;
    };
    executionHealth: {
        status: HealthStatus;
        timestamp: string;
    };
    readHealth: {
        status: HealthStatus;
        timestamp: string;
    };
}
export interface AlertingFrameworkHealth {
    isSufficientlySecure: boolean;
    hasPermanentEncryptionKey: boolean;
    alertingFrameworkHealth: AlertsHealth;
}
