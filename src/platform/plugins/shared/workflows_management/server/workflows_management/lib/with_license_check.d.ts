import type { RequestHandler, RouteMethod } from '@kbn/core/server';
import type { WorkflowsRequestHandlerContext } from '../../types';
/**
 * Wraps a request handler with a license check.
 * If the license is not valid, it will return a 403 error with a message.
 */
export declare const withLicenseCheck: <P = unknown, Q = unknown, B = unknown, Method extends RouteMethod = never>(handler: RequestHandler<P, Q, B, WorkflowsRequestHandlerContext, Method>) => RequestHandler<P, Q, B, WorkflowsRequestHandlerContext, Method>;
