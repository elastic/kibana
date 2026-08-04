import type { IKibanaResponse, KibanaRequest } from '@kbn/core/server';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
export declare const ELASTIC_AGENTIC_USER_AGENT = "elastic-agentic";
export declare const AGENTIC_COUNTER_TYPE = "agentic";
/**
 * Wraps a route handler with API usage telemetry. Skips counting for
 * Kibana-internal requests (x-elastic-internal-origin: kibana) and routes
 * without a registered routePath.
 *
 * @param request - The incoming Kibana request.
 * @param options - Telemetry options.
 * @param options.usageCounter - Counter to increment on each tracked request.
 * @param options.trackAgentic - When true, also increments the counter with
 *   `counterType: AGENTIC_COUNTER_TYPE` for requests whose User-Agent contains
 *   the {@link ELASTIC_AGENTIC_USER_AGENT} string.
 * @param handler - The route handler to execute.
 */
export declare function telemetryHandler<TResponse extends IKibanaResponse>(request: KibanaRequest, options: {
    usageCounter?: UsageCounter;
    trackAgentic?: boolean;
}, handler: () => Promise<TResponse> | TResponse): Promise<TResponse>;
