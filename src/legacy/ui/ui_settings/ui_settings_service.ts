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
import { Legacy } from 'kibana';
import { defaultsDeep } from 'lodash';
import Boom from 'boom';

import { SavedObjectsClientContract, SavedObjectAttribute } from 'src/core/server';
import { createOrUpgradeSavedConfig } from './create_or_upgrade_saved_config';

export interface UiSettingsServiceOptions {
  type: string;
  id: string;
  buildNum: number;
  overrides: Record<string, SavedObjectAttribute>;
  savedObjectsClient: SavedObjectsClientContract;
  getDefaults?: () => Record<string, UiSettingsParams>;
  logWithMetadata?: Legacy.Server['logWithMetadata'];
}

interface ReadOptions {
  ignore401Errors?: boolean;
  autoCreateOrUpgradeIfMissing?: boolean;
}

interface UserProvidedValue {
  userValue?: SavedObjectAttribute;
  isOverridden?: boolean;
}

type UiSettingsRawValue = UiSettingsParams & UserProvidedValue;

type UserProvided = Record<string, UserProvidedValue>;
type UiSettingsRaw = Record<string, UiSettingsRawValue>;

type UiSettingsType = 'json' | 'markdown' | 'number' | 'select' | 'boolean' | 'string';

interface UiSettingsParams {
  name: string;
  value: SavedObjectAttribute;
  description: string;
  category: string[];
  options?: string[];
  optionLabels?: Record<string, string>;
  requiresPageReload?: boolean;
  readonly?: boolean;
  type?: UiSettingsType;
}

export interface IUiSettingsService {
  getDefaults: () => Promise<Record<string, UiSettingsParams>>;
  get: <T extends SavedObjectAttribute = any>(key: string) => Promise<T>;
  getAll: <T extends SavedObjectAttribute = any>() => Promise<Record<string, T>>;
  getUserProvided: () => Promise<UserProvided>;
  setMany: <T extends SavedObjectAttribute = any>(changes: Record<string, T>) => Promise<void>;
  set: <T extends SavedObjectAttribute = any>(key: string, value: T) => Promise<void>;
  remove: (key: string) => Promise<void>;
  removeMany: (keys: string[]) => Promise<void>;
  isOverridden: (key: string) => boolean;
}
/**
 *  Service that provides access to the UiSettings stored in elasticsearch.
 *  @class UiSettingsService
 */
export class UiSettingsService implements IUiSettingsService {
  private readonly _type: UiSettingsServiceOptions['type'];
  private readonly _id: UiSettingsServiceOptions['id'];
  private readonly _buildNum: UiSettingsServiceOptions['buildNum'];
  private readonly _savedObjectsClient: UiSettingsServiceOptions['savedObjectsClient'];
  private readonly _overrides: UiSettingsServiceOptions['overrides'];
  private readonly _getDefaults: NonNullable<UiSettingsServiceOptions['getDefaults']>;
  private readonly _logWithMetadata: NonNullable<UiSettingsServiceOptions['logWithMetadata']>;

  constructor(options: UiSettingsServiceOptions) {
    const {
      type,
      id,
      buildNum,
      savedObjectsClient,
      // we use a function for getDefaults() so that defaults can be different in
      // different scenarios, and so they can change over time
      getDefaults = () => ({}),
      // function that accepts log messages in the same format as server.logWithMetadata
      logWithMetadata = () => {},
      overrides = {},
    } = options;

    this._type = type;
    this._id = id;
    this._buildNum = buildNum;
    this._savedObjectsClient = savedObjectsClient;
    this._getDefaults = getDefaults;
    this._overrides = overrides;
    this._logWithMetadata = logWithMetadata;
  }

  async getDefaults() {
    return await this._getDefaults();
  }

  // returns a Promise for the value of the requested setting
  async get<T extends SavedObjectAttribute = any>(key: string): Promise<T> {
    const all = await this.getAll();
    return all[key];
  }

  async getAll<T extends SavedObjectAttribute = any>() {
    const raw = await this.getRaw();

    return Object.keys(raw).reduce(
      (all, key) => {
        const item = raw[key];
        all[key] = ('userValue' in item ? item.userValue : item.value) as T;
        return all;
      },
      {} as Record<string, T>
    );
  }

  // NOTE: should be a private method
  async getRaw(): Promise<UiSettingsRaw> {
    const userProvided = await this.getUserProvided();
    return defaultsDeep(userProvided, await this.getDefaults());
  }

  async getUserProvided(options: ReadOptions = {}): Promise<UserProvided> {
    const userProvided: UserProvided = {};

    // write the userValue for each key stored in the saved object that is not overridden
    for (const [key, userValue] of Object.entries(await this._read(options))) {
      if (userValue !== null && !this.isOverridden(key)) {
        userProvided[key] = {
          userValue,
        };
      }
    }

    // write all overridden keys, dropping the userValue is override is null and
    // adding keys for overrides that are not in saved object
    for (const [key, userValue] of Object.entries(this._overrides)) {
      userProvided[key] =
        userValue === null ? { isOverridden: true } : { isOverridden: true, userValue };
    }

    return userProvided;
  }

  async setMany<T extends SavedObjectAttribute = any>(changes: Record<string, T>) {
    await this._write({ changes });
  }

  async set<T extends SavedObjectAttribute = any>(key: string, value: T) {
    await this.setMany({ [key]: value });
  }

  async remove(key: string) {
    await this.set(key, null);
  }

  async removeMany(keys: string[]) {
    const changes: Record<string, null> = {};
    keys.forEach(key => {
      changes[key] = null;
    });
    await this.setMany(changes);
  }

  isOverridden(key: string) {
    return this._overrides.hasOwnProperty(key);
  }

  // NOTE: should be private method
  assertUpdateAllowed(key: string) {
    if (this.isOverridden(key)) {
      throw Boom.badRequest(`Unable to update "${key}" because it is overridden`);
    }
  }

  private async _write<T extends SavedObjectAttribute = any>({
    changes,
    autoCreateOrUpgradeIfMissing = true,
  }: {
    changes: Record<string, T>;
    autoCreateOrUpgradeIfMissing?: boolean;
  }) {
    for (const key of Object.keys(changes)) {
      this.assertUpdateAllowed(key);
    }

    try {
      await this._savedObjectsClient.update(this._type, this._id, changes);
    } catch (error) {
      const { isNotFoundError } = this._savedObjectsClient.errors;
      if (!isNotFoundError(error) || !autoCreateOrUpgradeIfMissing) {
        throw error;
      }

      await createOrUpgradeSavedConfig({
        savedObjectsClient: this._savedObjectsClient,
        version: this._id,
        buildNum: this._buildNum,
        logWithMetadata: this._logWithMetadata,
      });

      await this._write({
        changes,
        autoCreateOrUpgradeIfMissing: false,
      });
    }
  }

  private async _read<T extends SavedObjectAttribute>({
    ignore401Errors = false,
    autoCreateOrUpgradeIfMissing = true,
  }: ReadOptions = {}): Promise<Record<string, T>> {
    const {
      isConflictError,
      isNotFoundError,
      isForbiddenError,
      isNotAuthorizedError,
    } = this._savedObjectsClient.errors;

    try {
      const resp = await this._savedObjectsClient.get(this._type, this._id);
      return resp.attributes;
    } catch (error) {
      if (isNotFoundError(error) && autoCreateOrUpgradeIfMissing) {
        const failedUpgradeAttributes = await createOrUpgradeSavedConfig<T>({
          savedObjectsClient: this._savedObjectsClient,
          version: this._id,
          buildNum: this._buildNum,
          logWithMetadata: this._logWithMetadata,
          onWriteError(writeError, attributes) {
            if (isConflictError(writeError)) {
              // trigger `!failedUpgradeAttributes` check below, since another
              // request caused the uiSettings object to be created so we can
              // just re-read
              return;
            }

            if (isNotAuthorizedError(writeError) || isForbiddenError(writeError)) {
              return attributes;
            }

            throw writeError;
          },
        });

        if (!failedUpgradeAttributes) {
          return await this._read({
            ignore401Errors,
            autoCreateOrUpgradeIfMissing: false,
          });
        }

        return failedUpgradeAttributes;
      }

      if (this.isIgnorableError(error, ignore401Errors)) {
        return {};
      }

      throw error;
    }
  }

  private isIgnorableError(error: Error, ignore401Errors: boolean) {
    const {
      isForbiddenError,
      isEsUnavailableError,
      isNotAuthorizedError,
    } = this._savedObjectsClient.errors;

    return (
      isForbiddenError(error) ||
      isEsUnavailableError(error) ||
      (ignore401Errors && isNotAuthorizedError(error))
    );
  }
}
