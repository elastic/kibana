import type { RequestHandlerContextBase } from '@kbn/core-http-server';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-server';
/**
 * `uiSettings` http request context provider during the preboot phase.
 * @public
 */
export interface PrebootUiSettingsRequestHandlerContext {
    /**
     * The {@link IUiSettingsClient | UI Settings client}.
     */
    client: IUiSettingsClient;
}
/**
 * The `core` context provided to route handler during the preboot phase.
 * @public
 */
export interface PrebootCoreRequestHandlerContext {
    /**
     * {@link PrebootUiSettingsRequestHandlerContext}
     */
    uiSettings: PrebootUiSettingsRequestHandlerContext;
}
/**
 * Base context passed to a route handler during the preboot phase, containing the `core` context part.
 * @public
 */
export interface PrebootRequestHandlerContext extends RequestHandlerContextBase {
    /**
     * Promise that resolves the {@link PrebootCoreRequestHandlerContext}
     */
    core: Promise<PrebootCoreRequestHandlerContext>;
}
