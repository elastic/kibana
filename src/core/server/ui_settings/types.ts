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
import { SavedObjectsClientContract, SavedObjectAttribute } from '../saved_objects/types';
/**
 * Server-side client that provides access to the advanced settings stored in elasticsearch.
 * The settings provide control over the behavior of the Kibana application.
 * For example, a user can specify how to display numeric or date fields.
 * Users can adjust the settings via Management UI.
 *
 * @public
 */
export interface IUiSettingsClient {
  /**
   * Returns registered uiSettings values {@link UiSettingsParams}
   */
  getRegistered: () => Readonly<Record<string, UiSettingsParams>>;
  /**
   * Retrieves uiSettings values set by the user with fallbacks to default values if not specified.
   */
  get: <T = any>(key: string) => Promise<T>;
  /**
   * Retrieves a set of all uiSettings values set by the user with fallbacks to default values if not specified.
   */
  getAll: <T = any>() => Promise<Record<string, T>>;
  /**
   * Retrieves a set of all uiSettings values set by the user.
   */
  getUserProvided: <T = any>() => Promise<Record<string, UserProvidedValues<T>>>;
  /**
   * Writes multiple uiSettings values and marks them as set by the user.
   */
  setMany: (changes: Record<string, any>) => Promise<void>;
  /**
   * Writes uiSettings value and marks it as set by the user.
   */
  set: (key: string, value: any) => Promise<void>;
  /**
   * Removes uiSettings value by key.
   */
  remove: (key: string) => Promise<void>;
  /**
   * Removes multiple uiSettings values by keys.
   */
  removeMany: (keys: string[]) => Promise<void>;
  /**
   * Shows whether the uiSettings value set by the user.
   */
  isOverridden: (key: string) => boolean;
}

/**
 * Describes the values explicitly set by user.
 * @public
 * */
export interface UserProvidedValues<T = any> {
  userValue?: T;
  isOverridden?: boolean;
}

/**
 * UiSettings deprecation field options.
 * @public
 * */
export interface DeprecationSettings {
  message: string;
  docLinksKey: string;
}

/**
 * UI element type to represent the settings.
 * @public
 * */
export type UiSettingsType = 'json' | 'markdown' | 'number' | 'select' | 'boolean' | 'string';

/**
 * UiSettings parameters defined by the plugins.
 * @public
 * */
export interface UiSettingsParams {
  /** title in the UI */
  name?: string;
  /** default value to fall back to if a user doesn't provide any */
  value?: SavedObjectAttribute;
  /** description provided to a user in UI */
  description?: string;
  /** used to group the configured setting in the UI */
  category?: string[];
  /** array of permitted values for this setting */
  options?: string[];
  /** text labels for 'select' type UI element */
  optionLabels?: Record<string, string>;
  /** a flag indicating whether new value applying requires page reloading */
  requiresPageReload?: boolean;
  /** a flag indicating that value cannot be changed */
  readonly?: boolean;
  /** defines a type of UI element {@link UiSettingsType} */
  type?: UiSettingsType;
  /** optional deprecation information. Used to generate a deprecation warning. */
  deprecation?: DeprecationSettings;
  /*
   * Allows defining a custom validation applicable to value change on the client.
   * @deprecated
   */
  validation?: ImageValidation | StringValidation;
}

export interface StringValidation {
  regexString: string;
  message: string;
}

export interface ImageValidation {
  maxSize: {
    length: number;
    description: string;
  };
}

/** @internal */
export interface InternalUiSettingsServiceSetup {
  /**
   * Sets settings with default values for the uiSettings.
   * @param settings
   */
  register(settings: Record<string, UiSettingsParams>): void;
  /**
   * Creates uiSettings client with provided *scoped* saved objects client {@link IUiSettingsClient}
   * @param savedObjectsClient
   */
  asScopedToClient(savedObjectsClient: SavedObjectsClientContract): IUiSettingsClient;
}

/** @public */
export interface UiSettingsServiceSetup {
  /**
   * Sets settings with default values for the uiSettings.
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
}

/** @public */
export interface UiSettingsServiceStart {
  /**
   * Creates a {@link IUiSettingsClient} with provided *scoped* saved objects client.
   *
   * This should only be used in the specific case where the client needs to be accessed
   * from outside of the scope of a {@link RequestHandler}.
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
}

/** @internal */
export type InternalUiSettingsServiceStart = UiSettingsServiceStart;
