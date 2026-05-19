import type { RequestHandlerContextBase, IRouter } from '@kbn/core-http-server';
import type { UiSettingsRequestHandlerContext } from '@kbn/core-ui-settings-server';
/**
 * Request handler context used by core's rendering routes.
 * @internal
 */
export interface InternalRenderingRequestHandlerContext extends RequestHandlerContextBase {
    core: Promise<{
        uiSettings: UiSettingsRequestHandlerContext;
    }>;
}
/**
 * Router bound to the {@link InternalRenderingRequestHandlerContext}.
 * Used by core's rendering routes.
 * @internal
 */
export type InternalRenderingRouter = IRouter<InternalRenderingRequestHandlerContext>;
