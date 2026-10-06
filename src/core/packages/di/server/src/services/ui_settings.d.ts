import type { ServiceToken } from '@kbn/core-di';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-server';
/**
 * The uiSettings client scoped to the current HTTP request.
 * @see {@link IUiSettingsClient}
 * @public
 */
export declare const UiSettingsClient: ServiceToken<IUiSettingsClient>;
/**
 * The global uiSettings client scoped to the current HTTP request.
 * @see {@link IUiSettingsClient}
 * @public
 */
export declare const GlobalUiSettingsClient: ServiceToken<IUiSettingsClient>;
