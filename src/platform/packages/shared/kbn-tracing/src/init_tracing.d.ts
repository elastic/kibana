import type { resources } from '@elastic/opentelemetry-node/sdk';
import type { TracingConfig } from '@kbn/tracing-config';
/**
 * Initialize the OpenTelemetry tracing provider
 * @param resource The OpenTelemetry resource information
 * @param tracingConfig The OpenTelemetry tracing configuration
 */
export declare function initTracing({ resource, tracingConfig, }: {
    resource: resources.Resource;
    tracingConfig: TracingConfig;
}): void;
