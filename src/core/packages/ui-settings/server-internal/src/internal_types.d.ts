import type { IRouter, RequestHandlerContextBase } from '@kbn/core-http-server';
import type { UiSettingsRequestHandlerContext } from '@kbn/core-ui-settings-server';
/**
 * Request handler context used by core's uiSetting routes.
 * @internal
 */
export interface InternalUiSettingsRequestHandlerContext extends RequestHandlerContextBase {
    core: Promise<{
        uiSettings: UiSettingsRequestHandlerContext;
    }>;
}
/**
 * Router bound to the {@link InternalUiSettingsRequestHandlerContext}.
 * Used by core's uiSetting routes.
 * @internal
 */
export type InternalUiSettingsRouter = IRouter<InternalUiSettingsRequestHandlerContext>;
