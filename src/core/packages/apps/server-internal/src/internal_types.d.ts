import type { IRouter, RequestHandlerContextBase } from '@kbn/core-http-server';
import type { UiSettingsRequestHandlerContext } from '@kbn/core-ui-settings-server';
/**
 * Request handler context used by core's coreApp routes.
 * @internal
 */
export interface InternalCoreAppsServiceRequestHandlerContext extends RequestHandlerContextBase {
    core: Promise<{
        uiSettings: UiSettingsRequestHandlerContext;
    }>;
}
/**
 * Router bound to the {@link InternalCoreAppsServiceRequestHandlerContext}.
 * Used by core's coreApp routes.
 * @internal
 */
export type InternalCoreAppsServiceRouter = IRouter<InternalCoreAppsServiceRequestHandlerContext>;
