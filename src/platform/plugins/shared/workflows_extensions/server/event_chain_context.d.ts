import type { KibanaRequest } from '@kbn/core/server';
import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';
export { X_ELASTIC_INTERNAL_ORIGIN_REQUEST };
/**
 * Context attached to the request when a workflow runs, so that when code
 * in that workflow emits an event (e.g. via emitEvent), we can infer the
 * event-chain depth and enforce a cap to prevent infinite loops.
 * Depth is incremented for every step in the chain (any workflow); the trigger
 * event handler caps scheduling when depth exceeds the configured max.
 *
 * `depth` may be `-1` when the execution has no persisted chain depth yet.
 */
export interface EventChainContext {
    depth: number;
    /** Workflow ids that already ran earlier in this event chain (cycle guard). */
    visitedWorkflowIds?: string[];
    sourceExecutionId?: string;
}
/**
 * HTTP header name used when a workflow step (e.g. kibana.request) makes an outbound request
 * to Kibana. The execution engine sets this to the current event-chain depth so the server
 * can restore context on the incoming request and enforce the event-chain depth cap.
 */
export declare const EVENT_CHAIN_DEPTH_HEADER = "x-kibana-event-chain-depth";
/**
 * HTTP header for the workflow execution id associated with the current chain hop. Set on outbound
 * requests so the server can restore `sourceExecutionId` on the incoming request.
 */
export declare const EVENT_CHAIN_SOURCE_EXECUTION_HEADER = "x-kibana-event-chain-source-execution-id";
/**
 * Base64url JSON array of visited workflow ids (bounded length) for HTTP emit recovery.
 */
export declare const EVENT_CHAIN_VISITED_WORKFLOW_IDS_HEADER = "x-kibana-event-chain-visited-workflows";
/**
 * Workflow execution id of the run that issued an outbound kibana.request so emit routes can
 * load chain state from the persisted execution when headers are incomplete.
 */
export declare const EVENT_CHAIN_EMITTER_EXECUTION_ID_HEADER = "x-kibana-workflow-execution-id";
/**
 * Symbol used to attach event-chain context to a KibanaRequest.
 */
export declare const WORKFLOW_EVENT_CHAIN_CONTEXT: unique symbol;
export declare function getEventChainDepthFromHeaders(headers: KibanaRequest['headers']): number | undefined;
/** Workflow execution id for chain context recovery on HTTP emit paths. */
export declare function getEmitterWorkflowExecutionIdFromRequest(request: KibanaRequest): string | undefined;
/**
 * Returns the event-chain context for the request.
 *
 * Two trusted paths:
 *  1. In-process (fakeRequest): the execution engine called setWorkflowEventChainContext before
 *     any step runs, so the Symbol is present and takes precedence.
 *  2. Inbound HTTP from kibana.request step: no Symbol exists, but the step marks its outbound
 *     call with x-elastic-internal-origin so request.isInternalApiRequest is true. Only then are
 *     the event-chain headers parsed.
 *
 * Note: isInternalApiRequest is derived from the presence of the x-elastic-internal-origin request
 * header (see KibanaRequest constructor). It is not enforced at the network layer, so a
 * sufficiently informed external caller could set it. This gate stops naive spoofing but should
 * not be treated as a hard trust boundary.
 */
export declare function getEventChainContext(request: KibanaRequest): EventChainContext | undefined;
/**
 * Sets the event-chain context on the request. Called by the execution engine
 * at the start of a workflow run so that any emitEvent call using this request
 * (e.g. in-process with the fakeRequest) will have the correct depth and sourceExecutionId.
 */
export declare function setWorkflowEventChainContext(request: KibanaRequest, context: EventChainContext): void;
/**
 * Returns headers that should be added to outbound HTTP requests to Kibana
 * when the request is made from a workflow step (e.g. kibana.request).
 * Enables the server to restore event-chain context and enforce depth limits.
 *
 * @param emitterWorkflowExecutionId - Current workflow run id for routes that load chain state from ES.
 */
export declare function getOutboundEventChainHeaders(request: KibanaRequest, emitterWorkflowExecutionId?: string): Record<string, string>;
