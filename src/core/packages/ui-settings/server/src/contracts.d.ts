import type { UiSettingsParams } from '@kbn/core-ui-settings-common';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { IUiSettingsClient } from './ui_settings_client';
/** @public */
export interface UiSettingsServiceSetup {
    /**
     * Sets settings with default values for the uiSettings
     * @param settings
     *
     * @example
     * ```ts
     * setup(core: CoreSetup){
     *  core.uiSettings.register([{
     *   foo: {
     *    name: i18n.translate('my foo settings'),
     *    value: true,
     *    description: 'add some awesomeness',
     *   },
     *  }]);
     * }
     * ```
     */
    register(settings: Record<string, UiSettingsParams>): void;
    /**
     * Sets settings with default values for the global uiSettings
     * @param settings
     *
     * @example
     * ```ts
     * setup(core: CoreSetup){
     *  core.uiSettings.register([{
     *   foo: {
     *    name: i18n.translate('my foo settings'),
     *    value: true,
     *    description: 'add some awesomeness',
     *   },
     *  }]);
     * }
     * ```
     */
    registerGlobal(settings: Record<string, UiSettingsParams>): void;
    /**
     * Sets an allowlist of setting keys.
     * @param keys
     *
     * @example
     * ```ts
     * setup(core: CoreSetup){
     *  core.uiSettings.setAllowlist(['csv:quoteValues', 'dateFormat:dow']);
     * }
     * ```
     */
    setAllowlist(keys: string[]): void;
}
/** @public */
export interface UiSettingsServiceStart {
    /**
     * Creates a {@link IUiSettingsClient} with provided *scoped* saved objects client.
     *
     * This should only be used in the specific case where the client needs to be accessed
     * from outside the scope of a {@link RequestHandler}.
     *
     * @example
     * ```ts
     * start(core: CoreStart) {
     *  const soClient = core.savedObjects.getScopedClient(arbitraryRequest);
     *  const uiSettingsClient = core.uiSettings.asScopedToClient(soClient);
     * }
     * ```
     */
    asScopedToClient(savedObjectsClient: SavedObjectsClientContract): IUiSettingsClient;
    /**
     * Creates a global {@link IUiSettingsClient} with provided *scoped* saved objects client.
     *
     * This should only be used in the specific case where the client needs to be accessed
     * from outside the scope of a {@link RequestHandler}.
     *
     * @example
     * ```ts
     * start(core: CoreStart) {
     *  const soClient = core.savedObjects.getScopedClient(arbitraryRequest);
     *  const uiSettingsClient = core.uiSettings.globalAsScopedToClient(soClient);
     * }
     * ```
     */
    globalAsScopedToClient(savedObjectsClient: SavedObjectsClientContract): IUiSettingsClient;
}
