import type { TracingConfig } from '@kbn/tracing-config';
import type { MetricsConfig } from '@kbn/metrics-config';
/**
 * Configuration for OpenTelemetry
 */
export interface TelemetryConfig {
    /**
     * Whether telemetry collection is enabled.
     */
    enabled: boolean;
    /**
     * Tracing config. See {@link TracingConfig}.
     */
    tracing: TracingConfig;
    /**
     * Metrics config. See {@link MetricsConfig}.
     */
    metrics: MetricsConfig;
}
