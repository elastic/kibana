import type { RequestHandler, RouteMethod, RequestHandlerContext } from '@kbn/core/server';
/**
 * This higher order request handler makes sure that errors are returned with
 * body formatted in the following shape:
 *
 * ```json
 * {
 *   "message": "...",
 *   "attributes": {}
 * }
 * ```
 */
export declare const handleErrors: <P, Q, B, Context extends RequestHandlerContext, Method extends RouteMethod>(handler: RequestHandler<P, Q, B, Context, Method>) => RequestHandler<P, Q, B, Context, Method>;
