import type { PrebootUiSettingsRequestHandlerContext, PrebootCoreRequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type { InternalUiSettingsServicePreboot } from '@kbn/core-ui-settings-server-internal';
/**
 * @internal
 */
export interface PrebootCoreRouteHandlerContextParams {
    uiSettings: InternalUiSettingsServicePreboot;
}
/**
 * Implementation of {@link PrebootCoreRequestHandlerContext}.
 * @internal
 */
export declare class PrebootCoreRouteHandlerContext implements PrebootCoreRequestHandlerContext {
    private readonly corePreboot;
    readonly uiSettings: PrebootUiSettingsRequestHandlerContext;
    constructor(corePreboot: PrebootCoreRouteHandlerContextParams);
}
