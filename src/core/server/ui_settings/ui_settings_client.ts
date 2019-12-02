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

import { SavedObjectsErrorHelpers } from '../saved_objects';
import { SavedObjectsClientContract } from '../saved_objects/types';
import { Logger } from '../logging';
import { createOrUpgradeSavedConfig } from './create_or_upgrade_saved_config';
import { IUiSettingsClient, UiSettingsParams } from './types';
import { CannotOverrideError } from './ui_settings_errors';

export interface UiSettingsServiceOptions {
  type: string;
  id: string;
  buildNum: number;
  savedObjectsClient: SavedObjectsClientContract;
  overrides?: Record<string, any>;
  defaults?: Record<string, UiSettingsParams>;
  log: Logger;
}

interface ReadOptions {
  ignore401Errors?: boolean;
  autoCreateOrUpgradeIfMissing?: boolean;
}

interface UserProvidedValue<T = any> {
  userValue?: T;
  isOverridden?: boolean;
}

type UiSettingsRawValue = UiSettingsParams & UserProvidedValue;

type UserProvided<T = any> = Record<string, UserProvidedValue<T>>;
type UiSettingsRaw = Record<string, UiSettingsRawValue>;

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

  getRegistered() {
    return this.defaults;
  }

  async get<T = any>(key: string): Promise<T> {
    const all = await this.getAll();
    return all[key];
  }

  async getAll<T = any>() {
    const raw = await this.getRaw();

    return Object.keys(raw).reduce((all, key) => {
      const item = raw[key];
      all[key] = ('userValue' in item ? item.userValue : item.value) as T;
      return all;
    }, {} as Record<string, T>);
  }

  async getUserProvided<T = any>(): Promise<UserProvided<T>> {
    const userProvided: UserProvided = {};

    // write the userValue for each key stored in the saved object that is not overridden
    for (const [key, userValue] of Object.entries(await this.read())) {
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

  async setMany(changes: Record<string, any>) {
    await this.write({ changes });
  }

  async set(key: string, value: any) {
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

  private assertUpdateAllowed(key: string) {
    if (this.isOverridden(key)) {
      throw new CannotOverrideError(`Unable to update "${key}" because it is overridden`);
    }
  }

  private async getRaw(): Promise<UiSettingsRaw> {
    const userProvided = await this.getUserProvided();
    return defaultsDeep(userProvided, this.defaults);
  }

  private async write({
    changes,
    autoCreateOrUpgradeIfMissing = true,
  }: {
    changes: Record<string, any>;
    autoCreateOrUpgradeIfMissing?: boolean;
  }) {
    for (const key of Object.keys(changes)) {
      this.assertUpdateAllowed(key);
    }

    try {
      await this.savedObjectsClient.update(this.type, this.id, changes);
    } catch (error) {
      if (!SavedObjectsErrorHelpers.isNotFoundError(error) || !autoCreateOrUpgradeIfMissing) {
        throw error;
      }

      await createOrUpgradeSavedConfig({
        savedObjectsClient: this.savedObjectsClient,
        version: this.id,
        buildNum: this.buildNum,
        log: this.log,
        handleWriteErrors: false,
      });

      await this.write({
        changes,
        autoCreateOrUpgradeIfMissing: false,
      });
    }
  }

  private async read({
    ignore401Errors = false,
    autoCreateOrUpgradeIfMissing = true,
  }: ReadOptions = {}): Promise<Record<string, any>> {
    try {
      const resp = await this.savedObjectsClient.get(this.type, this.id);
      return resp.attributes;
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error) && autoCreateOrUpgradeIfMissing) {
        const failedUpgradeAttributes = await createOrUpgradeSavedConfig({
          savedObjectsClient: this.savedObjectsClient,
          version: this.id,
          buildNum: this.buildNum,
          log: this.log,
          handleWriteErrors: true,
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
