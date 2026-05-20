import type { RequestHandler, RouteMethod } from '@kbn/core/server';
import type { WorkflowsRequestHandlerContext } from '../../../types';
/**
 * Wraps a request handler with a license and serverless availability check.
 * If workflows are not available in this environment, it will return a 403 (FORBIDDEN) error with a message.
 */
export declare const withAvailabilityCheck: <P = unknown, Q = unknown, B = unknown, Method extends RouteMethod = never>(handler: RequestHandler<P, Q, B, WorkflowsRequestHandlerContext, Method>) => RequestHandler<P, Q, B, WorkflowsRequestHandlerContext, Method>;
