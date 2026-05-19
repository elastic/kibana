import type { IRouter, RequestHandlerContextBase } from '@kbn/core-http-server';
import type { DeprecationsRequestHandlerContext } from '@kbn/core-deprecations-server';
/**
 * Request handler context used by core's deprecations routes.
 * @internal
 */
export interface InternalDeprecationRequestHandlerContext extends RequestHandlerContextBase {
    core: Promise<{
        deprecations: DeprecationsRequestHandlerContext;
    }>;
}
/**
 * Router bound to the {@link InternalDeprecationRequestHandlerContext}.
 * Used by core's deprecations routes.
 * @internal
 */
export type InternalDeprecationRouter = IRouter<InternalDeprecationRequestHandlerContext>;
