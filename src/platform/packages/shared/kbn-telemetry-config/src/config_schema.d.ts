import { type Type } from '@kbn/config-schema';
import type { TelemetryConfig } from './types';
/**
 * Properties to use in the {@link telemetryConfigSchema}.
 * They are exported separately because they are used by the telemetry plugin to extend its config schema
 * since everything is in the same `telemetry.*` config path.
 *
 * @internal
 */
export declare const telemetryConfigSchemaProps: {
    /**
     * Global toggle for telemetry. It disables all form of telemetry: product analytics, OTel tracing and OTel metrics.
     */
    enabled: Type<boolean>;
    /** The {@link tracingConfigSchema | tracing config schema} */
    tracing: Type<import("@kbn/tracing-config").TracingConfig>;
    /** The {@link metricsConfigSchema | metrics config schema} */
    metrics: Type<import("@kbn/metrics-config").MetricsConfig>;
};
/**
 * Schema for the OpenTelemetry configuration
 */
export declare const telemetryConfigSchema: Type<TelemetryConfig>;
