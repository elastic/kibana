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
import { defaultsDeep } from 'lodash';
import Boom from 'boom';

import { SavedObjectsClientContract, SavedObjectAttribute } from '../saved_objects/types';
import { Logger } from '../logging';
import { createOrUpgradeSavedConfig } from './create_or_upgrade_saved_config';
import { UiSettingsParams } from './ui_settings_service';

export interface UiSettingsServiceOptions {
  type: string;
  id: string;
  buildNum: number;
  savedObjectsClient: SavedObjectsClientContract;
  overrides?: Record<string, SavedObjectAttribute>;
  defaults?: Record<string, UiSettingsParams>;
  log: Logger;
}

interface ReadOptions {
  ignore401Errors?: boolean;
  autoCreateOrUpgradeIfMissing?: boolean;
}

interface UserProvidedValue<T extends SavedObjectAttribute = any> {
  userValue?: T;
  isOverridden?: boolean;
}

type UiSettingsRawValue = UiSettingsParams & UserProvidedValue;

type UserProvided<T extends SavedObjectAttribute = any> = Record<string, UserProvidedValue<T>>;
type UiSettingsRaw = Record<string, UiSettingsRawValue>;

/**
 * Service that provides access to the UiSettings stored in elasticsearch.
 *
 * @public
 */
export interface IUiSettingsClient {
  /**
   * Returns uiSettings default values {@link UiSettingsParams}
   */
  getDefaults: () => Record<string, UiSettingsParams>;
  /**
   * Retrieves uiSettings values set by the user with fallbacks to default values if not specified.
   */
  get: <T extends SavedObjectAttribute = any>(key: string) => Promise<T>;
  /**
   * Retrieves a set of all uiSettings values set by the user with fallbacks to default values if not specified.
   */
  getAll: <T extends SavedObjectAttribute = any>() => Promise<Record<string, T>>;
  /**
   * Retrieves a set of all uiSettings values set by the user.
   */
  getUserProvided: <T extends SavedObjectAttribute = any>() => Promise<
    Record<string, { userValue?: T; isOverridden?: boolean }>
  >;
  /**
   * Writes multiple uiSettings values and marks them as set by the user.
   */
  setMany: <T extends SavedObjectAttribute = any>(changes: Record<string, T>) => Promise<void>;
  /**
   * Writes uiSettings value and marks it as set by the user.
   */
  set: <T extends SavedObjectAttribute = any>(key: string, value: T) => Promise<void>;
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

export class UiSettingsClient implements IUiSettingsClient {
  private readonly type: UiSettingsServiceOptions['type'];
  private readonly id: UiSettingsServiceOptions['id'];
  private readonly buildNum: UiSettingsServiceOptions['buildNum'];
  private readonly savedObjectsClient: UiSettingsServiceOptions['savedObjectsClient'];
  private readonly overrides: NonNullable<UiSettingsServiceOptions['overrides']>;
  private readonly defaults: NonNullable<UiSettingsServiceOptions['defaults']>;
  private readonly log: Logger;

  constructor(options: UiSettingsServiceOptions) {
    const { type, id, buildNum, savedObjectsClient, log, defaults = {}, overrides = {} } = options;

    this.type = type;
    this.id = id;
    this.buildNum = buildNum;
    this.savedObjectsClient = savedObjectsClient;
    this.defaults = defaults;
    this.overrides = overrides;
    this.log = log;
  }

  getDefaults() {
    return this.defaults;
  }

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
    return defaultsDeep(userProvided, this.defaults);
  }

  async getUserProvided<T extends SavedObjectAttribute = any>(
    options: ReadOptions = {}
  ): Promise<UserProvided<T>> {
    const userProvided: UserProvided = {};

    // write the userValue for each key stored in the saved object that is not overridden
    for (const [key, userValue] of Object.entries(await this.read(options))) {
      if (userValue !== null && !this.isOverridden(key)) {
        userProvided[key] = {
          userValue,
        };
      }
    }

    // write all overridden keys, dropping the userValue is override is null and
    // adding keys for overrides that are not in saved object
    for (const [key, userValue] of Object.entries(this.overrides)) {
      userProvided[key] =
        userValue === null ? { isOverridden: true } : { isOverridden: true, userValue };
    }

    return userProvided;
  }

  async setMany<T extends SavedObjectAttribute = any>(changes: Record<string, T>) {
    await this.write({ changes });
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
    return this.overrides.hasOwnProperty(key);
  }

  // NOTE: should be private method
  assertUpdateAllowed(key: string) {
    if (this.isOverridden(key)) {
      throw Boom.badRequest(`Unable to update "${key}" because it is overridden`);
    }
  }

  private async write<T extends SavedObjectAttribute = any>({
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
      await this.savedObjectsClient.update(this.type, this.id, changes);
    } catch (error) {
      const { isNotFoundError } = this.savedObjectsClient.errors;
      if (!isNotFoundError(error) || !autoCreateOrUpgradeIfMissing) {
        throw error;
      }

      await createOrUpgradeSavedConfig({
        savedObjectsClient: this.savedObjectsClient,
        version: this.id,
        buildNum: this.buildNum,
        log: this.log,
      });

      await this.write({
        changes,
        autoCreateOrUpgradeIfMissing: false,
      });
    }
  }

  private async read<T extends SavedObjectAttribute>({
    ignore401Errors = false,
    autoCreateOrUpgradeIfMissing = true,
  }: ReadOptions = {}): Promise<Record<string, T>> {
    const {
      isConflictError,
      isNotFoundError,
      isForbiddenError,
      isNotAuthorizedError,
    } = this.savedObjectsClient.errors;

    try {
      const resp = await this.savedObjectsClient.get(this.type, this.id);
      return resp.attributes;
    } catch (error) {
      if (isNotFoundError(error) && autoCreateOrUpgradeIfMissing) {
        const failedUpgradeAttributes = await createOrUpgradeSavedConfig<T>({
          savedObjectsClient: this.savedObjectsClient,
          version: this.id,
          buildNum: this.buildNum,
          log: this.log,
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
          return await this.read({
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
    } = this.savedObjectsClient.errors;

    return (
      isForbiddenError(error) ||
      isEsUnavailableError(error) ||
      (ignore401Errors && isNotAuthorizedError(error))
    );
  }
}
