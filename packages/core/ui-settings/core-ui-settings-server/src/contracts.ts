/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { UiSettingsParams } from '@kbn/core-ui-settings-common';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { UserProfileSettingsClientFactoryProvider } from '@kbn/security-plugin/server/user_profile/user_profile_settings_client';
import type { IUiSettingsClient, IUserUiSettingsClient } from './ui_settings_client';

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

  /**
   * Creates an IUserUiSettingsClient (which extends IUiSettingsClient so that settings in the user's
   * profile can be retrieved.
   *
   * @param savedObjectsClient This client is not currently used by the underlying UserClient, but is included so that
   * future user specific settings/migrations will be able to be created in SO, if necessary, rather than UserProfiles
   */
  userAsScopedToClient(savedObjectsClient: SavedObjectsClientContract): IUserUiSettingsClient;

  /**
   * This provides a way for downstream plugins to provide the UiSettingsService with a way to create UserProfileSettingsClients
   *
   * @example The SecurityPlugin currently utilizes this on start to provide the necessary services
   *
   * the UserProfilesClientContract
   * @param userProfileSettingsClientFactoryProvider
   */
  setUserProfileSettingsClientFactoryProvider(
    userProfileSettingsClientFactoryProvider: UserProfileSettingsClientFactoryProvider
  ): void;
}
