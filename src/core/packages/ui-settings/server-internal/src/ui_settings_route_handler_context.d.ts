import type { CoreSavedObjectsRouteHandlerContext } from '@kbn/core-saved-objects-server-internal';
import type { UiSettingsRequestHandlerContext, IUiSettingsClient } from '@kbn/core-ui-settings-server';
import type { InternalUiSettingsServiceStart } from './types';
/**
 * The {@link UiSettingsRequestHandlerContext} implementation.
 * @internal
 */
export declare class CoreUiSettingsRouteHandlerContext implements UiSettingsRequestHandlerContext {
    #private;
    private readonly uiSettingsStart;
    private readonly savedObjectsRouterHandlerContext;
    constructor(uiSettingsStart: InternalUiSettingsServiceStart, savedObjectsRouterHandlerContext: CoreSavedObjectsRouteHandlerContext);
    get client(): IUiSettingsClient;
    get globalClient(): IUiSettingsClient;
}
