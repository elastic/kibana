/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { createOrUpgradeSavedConfig } from '../create_or_upgrade_saved_config';
import { CannotOverrideError } from '../ui_settings_errors';
import { Cache } from '../cache';
import { UiSettingsServiceOptions } from '../types';
import { BaseUiSettingsClient } from './base_ui_settings_client';

interface ReadOptions {
  autoCreateOrUpgradeIfMissing?: boolean;
}

interface UserProvidedValue<T = unknown> {
  userValue?: T;
  isOverridden?: boolean;
}

type UserProvided<T = unknown> = Record<string, UserProvidedValue<T>>;

/**
 * Common logic for setting / removing keys in a {@link IUiSettingsClient} implementation
 */
export abstract class UiSettingsClientCommon extends BaseUiSettingsClient {
  private readonly type: UiSettingsServiceOptions['type'];
  private readonly id: UiSettingsServiceOptions['id'];
  private readonly buildNum: UiSettingsServiceOptions['buildNum'];
  private readonly savedObjectsClient: UiSettingsServiceOptions['savedObjectsClient'];
  private readonly cache: Cache;

  constructor(options: UiSettingsServiceOptions) {
    super(options);
    const { savedObjectsClient, type, id, buildNum } = options;
    this.type = type;
    this.id = id;
    this.buildNum = buildNum;
    this.savedObjectsClient = savedObjectsClient;
    this.cache = new Cache();
  }

  async getUserProvided<T = unknown>(): Promise<UserProvided<T>> {
    const cachedValue = this.cache.get();
    if (cachedValue) {
      return cachedValue;
    }

    const userProvided: UserProvided<T> = this.onReadHook(await this.read());

    // write all overridden keys, dropping the userValue is override is null and
    // adding keys for overrides that are not in saved object
    for (const [key, value] of Object.entries(this.overrides)) {
      userProvided[key] =
        value === null ? { isOverridden: true } : { isOverridden: true, userValue: value };
    }

    this.cache.set(userProvided);

    return userProvided;
  }

  async setMany(
    changes: Record<string, any>,
    { handleWriteErrors }: { validateKeys?: boolean; handleWriteErrors?: boolean } = {}
  ) {
    this.cache.del();
    this.onWriteHook(changes);
    await this.write({ changes, handleWriteErrors });
  }

  async set(key: string, value: any) {
    await this.setMany({ [key]: value });
  }

  async remove(key: string) {
    await this.set(key, null);
  }

  async removeMany(
    keys: string[],
    options?: { validateKeys?: boolean; handleWriteErrors?: boolean }
  ) {
    const changes: Record<string, null> = {};
    keys.forEach((key) => {
      changes[key] = null;
    });
    await this.setMany(changes, options);
  }

  private assertUpdateAllowed(key: string) {
    if (Object.hasOwn(this.overrides, key)) {
      throw new CannotOverrideError(`Unable to update "${key}" because it is overridden`);
    }
  }

  private onWriteHook(changes: Record<string, unknown>) {
    for (const key of Object.keys(changes)) {
      this.assertUpdateAllowed(key);
    }

    for (const [key, value] of Object.entries(changes)) {
      this.validateKey(key, value);
    }
  }

  private onReadHook<T = unknown>(values: Record<string, unknown>) {
    // write the userValue for each key stored in the saved object that is not overridden
    // validate value read from saved objects as it can be changed via SO API
    const filteredValues: UserProvided<T> = {};
    for (const [key, userValue] of Object.entries(values)) {
      if (userValue === null || Object.hasOwn(this.overrides, key)) continue;
      try {
        this.validateKey(key, userValue);
        filteredValues[key] = {
          userValue: userValue as T,
        };
      } catch (error) {
        this.log.warn(`Ignore invalid UiSettings value. ${error}.`);
      }
    }

    return filteredValues;
  }

  private async write({
    changes,
    autoCreateOrUpgradeIfMissing = true,
    handleWriteErrors = false,
  }: {
    changes: Record<string, any>;
    autoCreateOrUpgradeIfMissing?: boolean;
    handleWriteErrors?: boolean;
  }) {
    try {
      await this.savedObjectsClient.update(this.type, this.id, changes, { refresh: false });
    } catch (error) {
      if (!SavedObjectsErrorHelpers.isNotFoundError(error) || !autoCreateOrUpgradeIfMissing) {
        throw error;
      }

      await createOrUpgradeSavedConfig({
        savedObjectsClient: this.savedObjectsClient,
        version: this.id,
        buildNum: this.buildNum,
        log: this.log,
        handleWriteErrors,
        type: this.type,
      });

      await this.write({
        changes,
        autoCreateOrUpgradeIfMissing: false,
      });
    }
  }

  private async read({ autoCreateOrUpgradeIfMissing = true }: ReadOptions = {}): Promise<
    Record<string, any>
  > {
    try {
      const resp = await this.savedObjectsClient.get<Record<string, any>>(this.type, this.id);
      return resp.attributes;
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error) && autoCreateOrUpgradeIfMissing) {
        const failedUpgradeAttributes = await createOrUpgradeSavedConfig({
          savedObjectsClient: this.savedObjectsClient,
          version: this.id,
          buildNum: this.buildNum,
          log: this.log,
          handleWriteErrors: true,
          type: this.type,
        });

        if (!failedUpgradeAttributes) {
          return await this.read({ autoCreateOrUpgradeIfMissing: false });
        }

        return failedUpgradeAttributes;
      }

      if (this.isIgnorableError(error)) {
        return {};
      }

      throw error;
    }
  }

  private isIgnorableError(error: Error) {
    const { isForbiddenError, isEsUnavailableError } = SavedObjectsErrorHelpers;
    return isForbiddenError(error) || isEsUnavailableError(error);
  }
}
