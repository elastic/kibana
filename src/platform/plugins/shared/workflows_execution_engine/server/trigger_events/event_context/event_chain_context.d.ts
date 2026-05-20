/**
 * Event-chain HTTP header parsing and request attachment live in `workflows_extensions`
 * so emit routes, management, and the execution engine share one implementation.
 */
export type { EventChainContext } from '@kbn/workflows-extensions/server';
export { EVENT_CHAIN_DEPTH_HEADER, EVENT_CHAIN_EMITTER_EXECUTION_ID_HEADER, EVENT_CHAIN_SOURCE_EXECUTION_HEADER, EVENT_CHAIN_VISITED_WORKFLOW_IDS_HEADER, WORKFLOW_EVENT_CHAIN_CONTEXT, X_ELASTIC_INTERNAL_ORIGIN_REQUEST, getEmitterWorkflowExecutionIdFromRequest, getEventChainContext, getEventChainDepthFromHeaders, getOutboundEventChainHeaders, setWorkflowEventChainContext, } from '@kbn/workflows-extensions/server';
