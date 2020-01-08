/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Observable } from 'rxjs';
import { UiSettingsParams, UserProvidedValues } from 'src/core/server/types';

/** @public */
export interface UiSettingsState {
  [key: string]: UiSettingsParams & UserProvidedValues;
}

/**
 * Client-side client that provides access to the advanced settings stored in elasticsearch.
 * The settings provide control over the behavior of the Kibana application.
 * For example, a user can specify how to display numeric or date fields.
 * Users can adjust the settings via Management UI.
 * {@link IUiSettingsClient}
 *
 * @public
 */
export interface IUiSettingsClient {
  /**
   * Gets the value for a specific uiSetting. If this setting has no user-defined value
   * then the `defaultOverride` parameter is returned (and parsed if setting is of type
   * "json" or "number). If the parameter is not defined and the key is not registered
   * by any plugin then an error is thrown, otherwise reads the default value defined by a plugin.
   */
  get: <T = any>(key: string, defaultOverride?: T) => T;

  /**
   * Gets an observable of the current value for a config key, and all updates to that config
   * key in the future. Providing a `defaultOverride` argument behaves the same as it does in #get()
   */
  get$: <T = any>(key: string, defaultOverride?: T) => Observable<T>;

  /**
   * Gets the metadata about all uiSettings, including the type, default value, and user value
   * for each key.
   */
  getAll: () => Readonly<Record<string, UiSettingsParams & UserProvidedValues>>;

  /**
   * Sets the value for a uiSetting. If the setting is not registered by any plugin
   * it will be stored as a custom setting. The new value will be synchronously available via
   * the `get()` method and sent to the server in the background. If the request to the
   * server fails then a updateErrors$ will be notified and the setting will be
   * reverted to its value before `set()` was called.
   */
  set: (key: string, value: any) => Promise<boolean>;

  /**
   * Overrides the default value for a setting in this specific browser tab. If the page
   * is reloaded the default override is lost.
   */
  overrideLocalDefault: (key: string, newDefault: any) => void;

  /**
   * Removes the user-defined value for a setting, causing it to revert to the default. This
   * method behaves the same as calling `set(key, null)`, including the synchronization, custom
   * setting, and error behavior of that method.
   */
  remove: (key: string) => Promise<boolean>;

  /**
   * Returns true if the key is a "known" uiSetting, meaning it is either registered
   * by any plugin or was previously added as a custom setting via the `set()` method.
   */
  isDeclared: (key: string) => boolean;

  /**
   * Returns true if the setting has no user-defined value or is unknown
   */
  isDefault: (key: string) => boolean;

  /**
   * Returns true if the setting wasn't registered by any plugin, but was either
   * added directly via `set()`, or is an unknown setting found in the uiSettings saved
   * object
   */
  isCustom: (key: string) => boolean;

  /**
   * Shows whether the uiSettings value set by the user.
   */
  isOverridden: (key: string) => boolean;

  /**
   * Returns an Observable that notifies subscribers of each update to the uiSettings,
   * including the key, newValue, and oldValue of the setting that changed.
   */
  getUpdate$: <T = any>() => Observable<{
    key: string;
    newValue: T;
    oldValue: T;
  }>;

  /**
   * Returns an Observable that notifies subscribers of each update to the uiSettings,
   * including the key, newValue, and oldValue of the setting that changed.
   */
  getSaved$: <T = any>() => Observable<{
    key: string;
    newValue: T;
    oldValue: T;
  }>;

  /**
   * Returns an Observable that notifies subscribers of each error while trying to update
   * the settings, containing the actual Error class.
   */
  getUpdateErrors$: () => Observable<Error>;
}
