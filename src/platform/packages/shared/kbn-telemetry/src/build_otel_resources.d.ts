import { resources } from '@elastic/opentelemetry-node/sdk';
/**
 * Unified function to build the OpenTelemetry resource for all services.
 * @param serviceName The service name used to look up APM config (defaults to 'kibana').
 * @returns The OpenTelemetry resource
 */
export declare function buildOtelResources(serviceName?: string): resources.Resource;
