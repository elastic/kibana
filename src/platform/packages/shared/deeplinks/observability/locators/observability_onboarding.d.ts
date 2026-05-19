import type { SerializableRecord } from '@kbn/utility-types';
export declare const OBSERVABILITY_ONBOARDING_LOCATOR: "OBSERVABILITY_ONBOARDING_LOCATOR";
export interface ObservabilityOnboardingLocatorParams extends SerializableRecord {
    /** If given, it will load the given onboarding flow
     * else will load the main onboarding screen.
     */
    source?: 'auto-detect' | 'customLogs' | 'kubernetes' | 'kubernetes-otel' | 'otel-logs' | 'firehose';
    category?: 'host' | 'kubernetes' | 'application' | 'cloud';
}
