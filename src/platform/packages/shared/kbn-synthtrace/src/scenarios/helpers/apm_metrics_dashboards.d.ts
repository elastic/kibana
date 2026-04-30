import type { Instance } from '@kbn/synthtrace-client';
export interface ApmMetricsServiceConfig {
    name: string;
    agentName: string;
    runtimeVersion?: string;
    runtimeName?: string;
    telemetrySdkName?: string;
    telemetrySdkLanguage?: string;
    extraMetrics?: Record<string, unknown> | Array<Record<string, unknown>>;
}
export declare const APM_METRICS_SERVICE_NAMES: {
    readonly JAVA_APM: "metrics-java-apm";
    readonly NODEJS_APM: "metrics-nodejs-apm";
    readonly RUBY_JRUBY: "metrics-ruby-jruby";
    readonly EDOT_JAVA: "metrics-edot-java";
    readonly EDOT_NODEJS: "metrics-edot-nodejs";
    readonly EDOT_DOTNET_V9: "metrics-edot-dotnet-v9";
    readonly EDOT_DOTNET_V8: "metrics-edot-dotnet-v8";
    readonly OTEL_JAVA: "metrics-otel-java";
    readonly OTEL_NODEJS: "metrics-otel-nodejs";
    readonly OTEL_DOTNET: "metrics-otel-dotnet";
    readonly OTEL_GO: "metrics-otel-go";
    readonly OTEL_NATIVE_EDOT_JAVA: "metrics-on-edot-java";
    readonly OTEL_NATIVE_EDOT_NODEJS: "metrics-on-edot-nodejs";
    readonly OTEL_NATIVE_EDOT_PYTHON: "metrics-on-edot-python";
    readonly OTEL_NATIVE_OTEL_JAVA: "metrics-on-otel-java";
    readonly OTEL_NATIVE_OTEL_NODEJS: "metrics-on-otel-nodejs";
    readonly OTEL_NATIVE_OTEL_PYTHON: "metrics-on-otel-python";
    readonly OTEL_NATIVE_OTEL_GO: "metrics-on-otel-go";
    readonly GO_CLASSIC: "metrics-go-classic";
    readonly RUBY_CLASSIC: "metrics-ruby-classic";
    readonly RUST: "metrics-rust";
};
export declare const SYSTEM_METRICS: Record<string, unknown>;
/**
 * Dashboard-catalog service configs: one per metrics dashboard type.
 * Used by both the CLI synthtrace scenario and the Scout test fixtures.
 */
export declare const APM_METRICS_DASHBOARD_SERVICES: ApmMetricsServiceConfig[];
/**
 * Non-dashboard service configs: services that exercise code paths
 * outside the dashboard catalog (JRuby JVM, Go classic, Ruby classic).
 */
export declare const APM_METRICS_NON_DASHBOARD_SERVICES: ApmMetricsServiceConfig[];
/**
 * All APM metrics services (dashboard + non-dashboard).
 */
export declare const APM_METRICS_ALL_SERVICES: ApmMetricsServiceConfig[];
export interface ApmMetricsServiceInstance {
    instance: Instance;
    config: ApmMetricsServiceConfig;
}
/**
 * Creates an APM service instance from a config entry, applying optional
 * runtime/SDK fields to the instance. Shared between the CLI scenario and
 * the Scout test fixture so both stay in sync.
 */
export declare const createMetricsServiceInstance: (config: ApmMetricsServiceConfig, environment: string) => ApmMetricsServiceInstance;
/**
 * Generates app-metric documents for a single timestamp, normalising
 * extraMetrics into an array and applying each entry as a separate metricset.
 */
export declare const generateAppMetrics: (instance: Instance, config: ApmMetricsServiceConfig, timestamp: number) => import("@kbn/synthtrace-client/src/lib/apm/metricset").Metricset<import("@kbn/synthtrace-client").ApmFields>[];
