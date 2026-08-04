import type { HttpStart } from '@kbn/core-http-browser';
import type { HealthCheckErrors } from '../apis';
export interface UseHealthCheckProps {
    http: HttpStart;
}
export interface UseHealthCheckResult {
    isLoading: boolean;
    healthCheckError: HealthCheckErrors | null;
}
export interface HealthStatus {
    isRulesAvailable: boolean;
    isSufficientlySecure: boolean;
    hasPermanentEncryptionKey: boolean;
}
export declare const useHealthCheck: (props: UseHealthCheckProps) => {
    isLoading: boolean;
    isInitialLoading: boolean;
    error: "alertsError" | "encryptionError" | "apiKeysDisabledError" | "apiKeysAndEncryptionError" | null;
};
