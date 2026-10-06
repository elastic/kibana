import type { IUiSettingsClient } from './ui_settings_client';
/**
 * Core's `uiSettings` request handler context.
 * @public
 */
export interface UiSettingsRequestHandlerContext {
    client: IUiSettingsClient;
    globalClient: IUiSettingsClient;
}
