import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { ServiceToken } from '@kbn/core-di';
/**
 * The uiSettings client scoped to the current space.
 * @see {@link IUiSettingsClient}
 * @public
 */
export declare const UiSettingsClient: ServiceToken<IUiSettingsClient>;
/**
 * The global uiSettings client.
 * @see {@link IUiSettingsClient}
 * @public
 */
export declare const GlobalUiSettingsClient: ServiceToken<IUiSettingsClient>;
